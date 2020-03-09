const config = require("../config")
const redis = require("redis-promise");

const statusKeyFor = username => `${username}:status`;
const tweetsKeyFor = username => `${username}:tweets`;

const parseJSON = (value) => {return value ? JSON.parse(value) : null};

const getStatusFor = username => {
  return redis.getString(statusKeyFor(username))
  .then(parseJSON);
};

const saveStatus = (username, status) => {
  const value = JSON.stringify(status);

  return redis.setString(statusKeyFor(username), value);
};

const saveTweets = (username, tweets) => {
  if(!tweets || tweets.length == 0) {
    return Promise.resolve();
  }

  const key = tweetsKeyFor(username);
  const stringified = tweets.map(JSON.stringify);

  return redis.pushLeft(key, stringified)
  .then(() => redis.trimLeft(key, 0, config.numberOfCachedTweets - 1));
};

module.exports = {
  getStatusFor,
  saveStatus,
  saveTweets
};
