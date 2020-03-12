const config = require('../config');
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
  const {status, username} = query

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
  const client = createInstance(clientCredentials);

  return client.get(endpoint, args || {})
    .catch(err => {
      return Promise.reject(err.length > 0 ? err[0] : err);
    });
};


const isInvalidOrExpiredTokenError = error => {
  return error.message && error.message === "Invalid or expired token.";
};

module.exports = {
  isInvalidOrExpiredTokenError,
  getUserTimeline,
  verifyCredentials
};
