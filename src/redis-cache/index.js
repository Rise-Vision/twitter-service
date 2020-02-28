const config = require("../config");
const redis = require("redis-promise");

const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : config.redisCacheHostname;

module.exports = {
  initdb(dbclient = null) {
    redis.initdb(dbclient, redisHost);
  },
  close() {
    redis.close();
  }
};
