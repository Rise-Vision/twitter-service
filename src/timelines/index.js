const config = require('../config');
const constants = require('../constants');
const oauthTokenProvider = require("../redis-otp/api");
const twitter = require('../twitter');

const { BAD_REQUEST_ERROR, FORBIDDEN_ERROR, SERVER_ERROR } = constants;

const validateQueryParams = (req) => {
  // TODO full validation in next card

  const { count } = req.query;

  return Promise.resolve({
    ...req.query,
    count: count ? Number(count) : config.defaultTweetCount
  });
};

const logAndSendError = (res, error, status) => {
  console.error(error);

  res.status(status);
  res.send(error.message);
};

const getUserTimeline = (query, res, credentials) => {
  return twitter.getUserTimeline(credentials, query.username)
  .then(timeline => {
    const tweets = timeline.slice(0, query.count);

    res.json({tweets});
  })
  .catch(error => {
    logAndSendError(res, error, SERVER_ERROR);
  });
};

const handleGetTweetsRequest = (req, res) => {
  return validateQueryParams(req)
  .then(query => {
    return oauthTokenProvider.getCredentials(req)
    .then(credentials => getUserTimeline(query, res, credentials))
    .catch(error => logAndSendError(res, error, FORBIDDEN_ERROR));
  })
  .catch(error => logAndSendError(res, error, BAD_REQUEST_ERROR));
}

const isCredentialsNotFound = err => {
  return err.message && err.message.includes("No credentials for");
};

module.exports = {
  handleGetTweetsRequest
};
