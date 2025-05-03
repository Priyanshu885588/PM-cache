require("dotenv").config();
const express = require("express");
const axios = require("axios");
const morgan = require("morgan");
const redis = require("redis");
const cors = require("cors");

const app = express();
app.use(cors());
let redisClient = null;

// Connect to Redis
async function connectRedis() {
  redisClient = redis.createClient({
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  }); // defaults to localhost:6379

  redisClient.on("error", (err) => console.error("Redis error:", err));

  await redisClient.connect();
}

// Start the proxy server
const startProxyServer = async (port, origin) => {
  await connectRedis();

  const ansiRegex = /\u001b\[.*?m/g;
  const stream = {
    write: async (message) => {
      const logEntry = message.replace(ansiRegex, "").trim();
      await redisClient.lPush("proxy:morgan", logEntry);
      await redisClient.lTrim("proxy:morgan", 0, 49);
    },
  };

  app.use(morgan("dev", { stream }));

  // Route for cache invalidation
  app.delete("/__cache", async (req, res) => {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing "key" query parameter' });
    }

    await redisClient.del(key);
    return res.json({ status: "Cache cleared", key });
  });

  // Route to get recent logs
  app.get("/__logs", async (req, res) => {
    try {
      const logs = await redisClient.lRange("proxy:logs", 0, -1);
      res.json(logs.map((log) => JSON.parse(log)));
    } catch (err) {
      console.error("Error fetching logs:", err.message);
      res.status(500).json({ error: "Could not fetch logs" });
    }
  });

  app.get("/__morgan", async (req, res) => {
    try {
      const logs = await redisClient.lRange("proxy:morgan", 0, -1);
      res.json(logs); // logs are just plain strings
    } catch (err) {
      res.status(500).json({ error: "Could not fetch logs" });
    }
  });

  // Proxy handler
  app.use(async (req, res) => {
    const cacheKey = req.originalUrl;
    const noCache = req.query["no-cache"] === "true";
    const ttl = parseInt(req.query["cache-ttl"]) || 60;

    try {
      if (!noCache) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          res.setHeader("X-Cache", "HIT");
          // Log to Redis
          await redisClient.lPush(
            "proxy:logs",
            JSON.stringify({
              url: req.originalUrl,
              status: "HIT",
              time: new Date().toISOString(),
            })
          );
          await redisClient.lTrim("proxy:logs", 0, 49); // keep last 50

          return res.status(200).json(JSON.parse(cached));
        }
      }

      // Forward to origin
      const response = await axios.get(`${origin}${req.originalUrl}`);
      const data = response.data;

      if (!noCache) {
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
      }

      res.setHeader("X-Cache", "MISS");
      //Log MISS to Redis
      await redisClient.lPush(
        "proxy:logs",
        JSON.stringify({
          url: req.originalUrl,
          status: "MISS",
          time: new Date().toISOString(),
        })
      );
      await redisClient.lTrim("proxy:logs", 0, 49);
      return res.status(200).json(data);
    } catch (err) {
      console.error("Proxy error:", err.message);
      return res.status(500).json({ error: "Proxy server error" });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Caching proxy server running on http://localhost:${port}`);
  });
};

module.exports = { startProxyServer };
