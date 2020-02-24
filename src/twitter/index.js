const Twitter = require('twitter');
const TwitterCredentials = require('./twitter-app-credentials');

const consumerKey = TwitterCredentials.consumer_key;
const consumerSecret = TwitterCredentials.consumer_secret;

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

const invokeEndpoint = (clientCredentials, endpoint, args) => {
  const client = createInstance(clientCredentials);

  return client.get(endpoint, args || {})
    .catch(err => {
      return Promise.reject(err.length > 0 ? err[0] : err);
    });
};

module.exports = {
  verifyCredentials
};
