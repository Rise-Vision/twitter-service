const config = require('../config');
const constants = require('../constants');

const Twitter = require('twitter');
const TwitterCredentials = require('./twitter-app-credentials');

const consumerKey = TwitterCredentials.consumer_key;
const consumerSecret = TwitterCredentials.consumer_secret;
const {numberOfCachedTweets} = config

const createInstance = (clientCredentials) => {
  const client = new Twitter({
    "consumer_key": consumerKey,
    "consumer_secret": consumerSecret,
    "access_token_key": clientCredentials.oauth_token,
    "access_token_secret": clientCredentials.oauth_token_secret
  });

  return client;
};

const verifyCredentials = credentials => {
  return invokeEndpoint(credentials, 'account/verify_credentials')
    .then(() => {
      return true;
    });
};

const getUserTimeline = (credentials, query) => {
  const {status, username} = query;

  const args = {
    screen_name: username,
    count: numberOfCachedTweets,
    tweet_mode: 'extended'
  };

  if (status.lastTweetId) {
    args.since_id = status.lastTweetId;
  }

  return invokeEndpoint(credentials, 'statuses/user_timeline', args);
};

const invokeEndpoint = (clientCredentials, endpoint, args) => {
  return new Promise((resolve, reject) => {
    const client = createInstance(clientCredentials);

    client.get(endpoint, args || {}, function (err, data, response) {
      const total = Number(response.headers['x-rate-limit-limit']);
      const remaining = Number(response.headers['x-rate-limit-remaining']);
      const resetTs = Number(response.headers['x-rate-limit-reset']);
      const quota = {total, remaining, resetTs, valid: total > 0};
      const status = response.status;

      if (err) {
        const error = {
          status,
          quota,
          error: err.length > 0 ? err[0] : err
        };

        reject(error);
      } else {
        resolve({status, quota, data});
      }
    });
  });
};

const isInvalidOrExpiredTokenError = error => {
  return error.code === constants.TWITTER_API_INVALID_OR_EXPIRED_TOKEN;
};

const isQuotaLimitReachedError = error => {
  return error.quotaLimitReached;
};

const isInvalidUsernameError = error => {
  return error.code === constants.TWITTER_API_RESOURCE_NOT_FOUND_CODE;
}

module.exports = {
  isInvalidOrExpiredTokenError,
  isQuotaLimitReachedError,
  isInvalidUsernameError,
  getUserTimeline,
  verifyCredentials
};
