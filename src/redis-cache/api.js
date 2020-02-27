const redis = require("redis-promise");

const statusKeyFor = username => `${ username }:status`;

const asJSON = value => value ? JSON.parse(value) : null;

const getStatusFor = username => {
  return redis.getString(statusKeyFor(username))
  .then(asJSON);
};

module.exports = {
  getStatusFor
};
