const util = require("util");
const redis = require("redis");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;

let client = null;
let promisified = ["get", "del", "set", "sadd", "srem", "hmset", "hgetall", "hdel", "smembers", "flushall", "exists", "incr"];

module.exports = {
  initdb(dbclient = null) {
    client = dbclient || redis.createClient({host: redisHost});
    if (!dbclient) {client.on("error", console.error);}

    if (!Array.isArray(promisified)) {return;}

    promisified = promisified.reduce((obj, el)=>{
      return {...obj, [el]: util.promisify(client[el].bind(client))};
    }, {});
  },
  getSet(key) {
    return promisified.smembers(key);
  },
  getString(key) {
    return promisified.get(key);
  }
};
