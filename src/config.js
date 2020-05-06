/* eslint-disable no-magic-numbers, no-warning-comments */

const {HOURS, MINUTES} = require("./constants");

const testServer = "rvacore-test";
const prodServer = "rvaserver2";

const currentServer = process.env.NODE_ENV === "prod" ? prodServer : testServer;

module.exports = {
  defaultPort: 80,
  defaultTweetCount: 25,
  cacheExpirationInMillis: 4 * HOURS,
  loadingFlagTimeoutInMillis: 2 * MINUTES,
  quotaNormalPct: 0.5,
  quotaSeverePct: 0.2,

  /* client will be asked to retry after this time to see if loading flag has been cleared */
  retryLoadInSeconds: 30,
  numberOfCachedTweets: 100,
  redisCacheHostname: "ts-redis-master",
  redisOtpHostname: "otp-redis-master",

  coreBaseUrl: `https://${currentServer}.appspot.com/_ah/api`,
};
