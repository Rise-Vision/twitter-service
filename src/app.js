const express = require("express");
const http = require("http");
const pkg = require("../package.json");
const config = require("./config");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json(); // eslint-disable-line no-unused-vars
const port = process.env.TS_PORT || config.defaultPort;
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "ts-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;

app.get('/twitterservice', function(req, res) {
  res.send(`Twitter Service: ${podname} ${pkg.version}`);
});

const start = ()=>{
  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err);
    }

    console.log(`server is listening on ${port}`);

    redis.initdb(null, redisHost);
  })
};

const stop = ()=>{
  redis.close();
  server.close();
};

module.exports = {
  start,
  stop
};
