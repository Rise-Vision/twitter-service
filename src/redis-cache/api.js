const redis = require("redis-promise");

const statusKeyFor = username => `${ username }:status`;

const parseJSON = value => value ? JSON.parse(value) : null;

const getStatusFor = username => {
  return redis.getString(statusKeyFor(username))
  .then(parseJSON);
};

const saveStatus = (username, status) => {
  const value = JSON.stringify(status);

  return redis.setString(statusKeyFor(username), value);
};

module.exports = {
  getStatusFor,
  saveStatus
};
