const config = require('../config');
const constants = require('../constants');
const cache = require('../redis-cache/api');
const oauthTokenProvider = require("../redis-otp/api");
const twitter = require('../twitter');

const {
  BAD_REQUEST_ERROR, CONFLICT_ERROR, CONFLICT_ERROR_MESSAGE, FORBIDDEN_ERROR,
  SERVER_ERROR
} = constants;

const validationErrorFor = message => Promise.reject(new Error(message));

const currentTimestamp = () => new Date().getTime();

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

const sendError = (res, message, status) => {
  res.status(status);
  res.send(message);
};

const logAndSendError = (res, error, status) => {
  console.error(error);

  sendError(res, error.message, status);
};

const handleAnotherRequestIsAlreadyLoadingUserTimeline = (query, res, credentials) => {
  const elapsed = currentTimestamp() - query.status.loadingStarted;

  if(elapsed > config.loadingFlagTimeoutInMillis) {
    return requestRemoteUserTimeline(query, res, credentials);
  }

  // TODO check cached entries will be implemented in other card

  sendError(res, CONFLICT_ERROR_MESSAGE, CONFLICT_ERROR);
};

const saveLoadingFlag = (query, loading) => {
  query.status.loading = loading;

  return cache.saveStatus(query.username, { ...query.status });
}

const returnTimeline = (query, res, timeline) => {
  const tweets = timeline.slice(0, query.count);

  res.json({tweets});
};

const requestRemoteUserTimeline = (query, res, credentials) => {
  return saveLoadingFlag(query, true)
  .then(() => {
    return twitter.getUserTimeline(credentials, query.username)
    .then(timeline => {
      return saveLoadingFlag(query, false)
      .then(() => returnTimeline(query, res, timeline));
    })
    .catch(error => {
      return saveLoadingFlag(query, false)
      .then(() => logAndSendError(res, error, SERVER_ERROR));
    });
  });
};

const getTweets = (query, res, credentials) => {
  return cache.getStatusFor(query.username)
  .then(status => {
    query.status = status || {};

    if(status && status.loading) {
      return handleAnotherRequestIsAlreadyLoadingUserTimeline(query, res, credentials);
    } else {
      return requestRemoteUserTimeline(query, res, credentials);
    }
  })
};

const handleGetTweetsRequest = (req, res) => {
  return validateQueryParams(req)
  .then(query => {
    return oauthTokenProvider.getCredentials(req)
    .then(credentials => {
      return getTweets(query, res, credentials)
      .catch(error => logAndSendError(res, error, SERVER_ERROR));
    })
    .catch(error => logAndSendError(res, error, FORBIDDEN_ERROR));
  })
  .catch(error => logAndSendError(res, error, BAD_REQUEST_ERROR));
}

module.exports = {
  handleGetTweetsRequest
};
