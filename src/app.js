const express = require("express");
const http = require("http");
const pkg = require("../package.json");
const config = require("./config");
const port = process.env.TS_PORT || config.defaultPort;
const app = express();
const server = http.createServer(app);
const headers = require("./middleware/headers");
const podname = process.env.podname;
const redisCache = require("./redis-cache")
const redisOTP = require("./redis-otp/datastore");
const credentials = require("./credentials");
const timelines = require("./timelines");

app.use(headers.setHeaders);

// This is required by ingress health check
app.get("/", (req, res)=>res.end());

app.get('/twitter', function(req, res) {
  res.send(`Twitter Service: ${podname} ${pkg.version}`);
});

app.get("/twitter/verify-credentials", credentials.handleVerifyCredentialsRequest);
app.get("/twitter/get-presentation-tweets", timelines.handleGetPresentationTweetsRequest);
app.get("/twitter/get-tweets", timelines.handleGetTweetsEncryptedRequest);

const start = ()=>{
  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err);
    }

    console.log(`server is listening on ${port}`);

    redisCache.initdb(null);
    redisOTP.initdb(null);
  })
};

const stop = ()=>{
  redisCache.close();
  redisOTP.close();
  server.close();
};

module.exports = {
  start,
  stop
};
