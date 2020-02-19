const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;

let otpRedis = null;

const checkKey = (companyId) => {
  return redis.getSet(`${companyId}:twitter`);
};

const getCredentials = key => {
  return redis.getString(key)
    .then(stringCredentials => JSON.parse(stringCredentials));
};

const init = () => {
  otpRedis = redis.createClient({host: redisHost});

  otpRedis.on("error", console.error);
};

module.exports = {
  checkKey,
  getCredentials,
  init
};
