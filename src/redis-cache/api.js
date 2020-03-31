const config = require("../config")
const redis = require("redis-promise");

const statusKeyFor = username => `${username}:status`;
const tweetsKeyFor = username => `${username}:tweets`;
const userQuotaKeyFor = companyId => `${companyId}:quota:user-timeline`;
const companyIdKeyFor = presentationId => `presentation:${presentationId}:companyId`;
const usernameKeyFor = (presentationId, componentId) => `presentation:${presentationId}:component:${componentId}:username`;

const parseJSON = (value) => {return value ? JSON.parse(value) : null};

const getStatusFor = username => {
  return redis.getString(statusKeyFor(username))
  .then(parseJSON);
};

const saveStatus = (username, status) => {
  const value = JSON.stringify(status);

  return redis.setString(statusKeyFor(username), value);
};

const getTweetsFor = (username, count) => {
  const key = tweetsKeyFor(username);

  return redis.getListRange(key, 0, count - 1)
  .then(tweets => {
    return (tweets || []).map(parseJSON);
  });
}

const saveTweets = (username, tweets) => {
  if (!tweets || tweets.length === 0) {
    return Promise.resolve();
  }

  const key = tweetsKeyFor(username);
  const stringified = tweets.map(JSON.stringify);

  return redis.pushLeft(key, stringified)
  .then(() => redis.trimLeft(key, 0, config.numberOfCachedTweets - 1));
};

const getUserQuotaFor = companyId => {
  return redis.getString(userQuotaKeyFor(companyId))
  .then(parseJSON);
}

const saveUserQuota = (companyId, quota) => {
  const value = JSON.stringify(quota);

  return redis.setString(userQuotaKeyFor(companyId), value);
};

const getCompanyIdFor = presentationId => {
  return redis.getString(companyIdKeyFor(presentationId));
}

const saveCompanyId = (presentationId, companyId) => {
  return redis.setString(companyIdKeyFor(presentationId), companyId);
};

const getUsernameFor = (presentationId, componentId) => {
  return redis.getString(usernameKeyFor(presentationId, componentId));
}

const saveUsername = (presentationId, componentId, username) => {
  return redis.setString(usernameKeyFor(presentationId, componentId), username);
};

module.exports = {
  getStatusFor,
  getTweetsFor,
  saveStatus,
  saveTweets,
  getUserQuotaFor,
  saveUserQuota,
  getCompanyIdFor,
  saveCompanyId,
  getUsernameFor,
  saveUsername
};
