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

  app.use(morgan("dev"));

  // Route for cache invalidation
  app.delete("/__cache", async (req, res) => {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ error: 'Missing "key" query parameter' });
    }

    await redisClient.del(key);
    return res.json({ status: "Cache cleared", key });
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
