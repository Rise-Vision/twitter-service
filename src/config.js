/* eslint-disable no-magic-numbers, no-warning-comments */

const {HOURS, MINUTES} = require("./constants");

const testServer = "rvacore-test";
// const prodServer = "rvaserver2";

// TODO: configure conditionally when NODE_ENV variables finalized
const blueprintStage = "staging";

// TODO: Until we setup production deployment, force using test server so we don't rely on NODE_ENV yet and cause issues with redis connections
const currentServer = testServer;

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

  coreBlueprintUrl: `https://widgets.risevision.com/${blueprintStage}/templates/PRODUCT_CODE/blueprint.json`
};
