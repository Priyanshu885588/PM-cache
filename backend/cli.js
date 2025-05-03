// backend/cli.js
const yargs = require("yargs");
const { startProxyServer } = require("./server");

const argv = yargs
  .option("port", {
    alias: "p",
    type: "number",
    description: "Port to run the proxy server on",
    demandOption: true,
  })
  .option("origin", {
    alias: "o",
    type: "string",
    description: "Origin server base URL",
    demandOption: true,
  })
  .help()
  .alias("help", "h").argv;

startProxyServer(argv.port, argv.origin);
