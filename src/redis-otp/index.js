const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;

let otpRedis = null;

const checkKey = (req) => {
  return redis.getSet(`${req.body.companyId}:twitter`);
};

const getCredentials = key => {
  return redis.getString(key)
    .then(stringCredentials => JSON.parse(stringCredentials));
};

const init = () => {
  otpRedis = redis.initdb(null, redisHost);
};

module.exports = {
  checkKey,
  getCredentials,
  init
};
