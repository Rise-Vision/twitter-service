const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

module.exports = {
  defaultPort: 80,
  defaultTweetCount: 25,
  cacheExpirationInMillis: 4 * HOURS,
  loadingFlagTimeoutInMillis: 2 * MINUTES,
  numberOfCachedTweets: 100,
  redisCacheHostname: "ts-redis-master",
  redisOtpHostname: "otp-redis-master"
};
