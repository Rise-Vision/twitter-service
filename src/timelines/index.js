const config = require('../config');
const constants = require('../constants');
const oauthTokenProvider = require("../redis-otp/api");
const twitter = require('../twitter');

const { BAD_REQUEST_ERROR, FORBIDDEN_ERROR, SERVER_ERROR } = constants;

const validationErrorFor = message => Promise.reject(new Error(message));

const validateQueryParams = (req) => {
  const {companyId, count, username} = req.query;

  if (!companyId) {
    return validationErrorFor("Company id was not provided");
  }

  if (!username) {
    return validationErrorFor("Username was not provided");
  }

  if (count && !/^\d+$/.test(count)) {
    return validationErrorFor(`'count' is not a valid integer value: ${count}`);
  }

  const countNumber = count ? Number(count) : config.defaultTweetCount;

  if(countNumber < 1 || countNumber > config.numberOfCachedTweets) {
    return validationErrorFor(`'count' is out of range: ${countNumber}`);
  }

  return Promise.resolve({
    ...req.query,
    count: countNumber
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

module.exports = {
  handleGetTweetsRequest
};
