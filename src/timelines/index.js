/* eslint-disable max-statements, no-warning-comments */

const config = require('../config');
const constants = require('../constants');
const cache = require('../redis-cache/api');
const oauthTokenProvider = require("../redis-otp/api");
const twitter = require('../twitter');
const core = require('../core');
const {currentTimestamp} = require('../utils');
const formatter = require('./data_formatter');
const utils = require('../utils');

const {
  BAD_REQUEST_ERROR, CONFLICT_ERROR, CONFLICT_ERROR_MESSAGE, FORBIDDEN_ERROR,
  NOT_FOUND_ERROR, SERVER_ERROR, SECONDS, PERCENT
} = constants;

const quotaLimitError = {message: "Quota limit reached."};

const validateQueryParams = (req) => {
  const {companyId, count, username} = req.query;

  if (!companyId) {
    return utils.validationErrorFor("Company id was not provided");
  }

  if (!username) {
    return utils.validationErrorFor("Username was not provided");
  }

  if (count && !(/^\d+$/).test(count)) {
    return utils.validationErrorFor(`'count' is not a valid integer value: ${count}`);
  }

  const countNumber = count ? Number(count) : config.defaultTweetCount;

  if (countNumber < 1 || countNumber > config.numberOfCachedTweets) {
    return utils.validationErrorFor(`'count' is out of range: ${countNumber}`);
  }

  return Promise.resolve({
    ...req.query,
    username: username.toLowerCase(),
    count: countNumber
  });
};

const sendError = (res, message, status) => {
  res.status(status);
  res.send(message);
};

const sendInvalidUsernameError = (res, query) => {
  const message = `Username not found: '${query.username}'`;

  sendError(res, message, NOT_FOUND_ERROR);
};

const logAndSendError = (res, error, status) => {
  console.error(error);

  sendError(res, error.message, status);
};

const hasCachedTweets = (query) => {
  return query.status.lastUpdated;
};

const handleAnotherRequestIsAlreadyLoadingUserTimeline = (query, res, credentials) => {
  const elapsed = currentTimestamp() - (query.status.loadingStarted || 0);

  if (elapsed > config.loadingFlagTimeoutInMillis) {
    return requestRemoteUserTimeline(query, res, credentials);
  }

  if (hasCachedTweets(query)) {
    return returnTweetsFromCache(query, res);
  }

  sendError(res, CONFLICT_ERROR_MESSAGE, CONFLICT_ERROR);
};

const saveStatus = (query) => {
  return cache.saveStatus(query.username, {...query.status});
}

const checkUserQuota = (query) => {
  const {companyId} = query;

  return cache.getUserQuotaFor(companyId)
  .then(quota => {
    if (!quota || quota.remaining > 0 || quota.resetTs < currentTimestamp() / SECONDS) {
      return Promise.resolve();
    }

    const err = {...quota, quotaLimitReached: true};

    return Promise.reject(err);
  });
}

const saveUserQuota = (query, apiRes) => {
  const {companyId} = query;
  const remaining = apiRes.status === CONFLICT_ERROR ? 0 : apiRes.quota && apiRes.quota.remaining;
  const resetTs = apiRes.quota && apiRes.quota.resetTs;
  const quota = {remaining, resetTs};

  return apiRes.quota && apiRes.quota.valid ? cache.saveUserQuota(companyId, quota) : Promise.resolve();
}

const logUserQuota = (companyId, quota) => {
  if (!quota || !quota.total || !quota.remaining) {
    console.warn(`Missing rate limit headers for company: ${companyId}`);
  } else if (quota.remaining < quota.total * config.quotaSeverePct) {
    console.warn(`Current quota usage above ${(1 - config.quotaSeverePct) * PERCENT}% for company: ${companyId}`);
  } else if (quota.remaining < quota.total * config.quotaNormalPct) {
    console.warn(`Current quota usage above ${(1 - config.quotaNormalPct) * PERCENT}% for company: ${companyId}`);
  }
}

const saveLoadingFlag = (query, loading) => {
  query.status.loading = loading;
  query.status.loadingStarted = loading ? currentTimestamp() : null;

  return saveStatus(query);
}

const saveLastUpdatedStatus = (query, params) => {
  query.status.lastUpdated = currentTimestamp();

  Object.assign(query.status, params);

  return saveStatus(query);
};

const saveStatusValuesForTimeline = (query, timeline) => {
  if (timeline && timeline.length > 0) {
    query.status.lastTweetId = timeline[0].id_str;
  }

  return saveLastUpdatedStatus(query, {invalidUsername: false});
}

const getCacheExpirationInSeconds = (status) => {
  // updated data already loading, return low expiration
  if (status.loading) {
    return config.retryLoadInSeconds;
  }

  const expirationTimestamp = status.lastUpdated + config.cacheExpirationInMillis;
  let remainingMillis = expirationTimestamp - currentTimestamp();
  remainingMillis = Math.max(remainingMillis, 0);

  return Math.ceil(remainingMillis / SECONDS) + 1;
};

const returnTimeline = (query, res, timeline) => {
  const expiration = getCacheExpirationInSeconds(query.status);
  const tweets = timeline.slice(0, query.count);

  res.header("Cache-control", `private, max-age=${expiration}`);

  res.json({
    tweets,
    cached: Boolean(query.cached)
  });
};

const handleTwitterApiCallError = (res, query, error) => {
  if (twitter.isInvalidOrExpiredTokenError(error)) {
    return logAndSendError(res, error, FORBIDDEN_ERROR);
  } else if (twitter.isQuotaLimitReachedError(error)) {
    return logAndSendError(res, quotaLimitError, CONFLICT_ERROR);
  }

  if (twitter.isInvalidUsernameError(error)) {
    return saveLastUpdatedStatus(query, {invalidUsername: true})
    .then(() => sendInvalidUsernameError(res, query));
  }

  logAndSendError(res, error, SERVER_ERROR);
};

const tweetsCacheIsCurrentFor = (query) => {
  const lastUpdated = query.status.lastUpdated || 0;
  const elapsed = currentTimestamp() - lastUpdated;

  return elapsed <= config.cacheExpirationInMillis;
};

const returnTweetsFromCache = (query, res) => {
  if (query.status.invalidUsername) {
    return sendInvalidUsernameError(res, query);
  }

  return cache.getTweetsFor(query.username, query.count)
  .then(tweets => {
    query.cached = true;

    return returnTimeline(query, res, tweets);
  });
};

const saveUserTimeline = (query, timeline) => {
  const formattedTimeline = formatter.getTimelineFormatted(timeline);

  return cache.saveTweets(query.username, formattedTimeline)
  .then(() => saveStatusValuesForTimeline(query, timeline))
  .then(() => formattedTimeline);
};

const returnRemoteUserTimeline = (query, res, timeline) => {
  if (timeline.length < query.count) {
    return returnTweetsFromCache(query, res);
  }

  return returnTimeline(query, res, timeline);
};

const requestRemoteUserTimeline = (query, res, credentials) => {
  const {companyId} = query;

  return checkUserQuota(query)
  .then(() => saveLoadingFlag(query, true))
  .then(() => {
    return twitter.getUserTimeline(credentials, query)
    .then(resp => {
      logUserQuota(companyId, resp.quota);

      return saveUserTimeline(query, resp.data)
      .then(formattedTimeline => {
        return saveLoadingFlag(query, false)
        .then(() => saveUserQuota(query, resp))
        .then(() => returnRemoteUserTimeline(query, res, formattedTimeline));
      });
    })
    .catch(err => {
      logUserQuota(companyId, err.quota);

      return saveLoadingFlag(query, false)
      .then(() => saveUserQuota(query, err))
      .then(() => handleTwitterApiCallError(res, query, err.error));
    });
  });
};

const getTweets = (query, res, credentials) => {
  return cache.getStatusFor(query.username)
  .then(status => {
    query.status = status || {};

    if (status && status.loading) {
      return handleAnotherRequestIsAlreadyLoadingUserTimeline(query, res, credentials);
    } else if (tweetsCacheIsCurrentFor(query)) {
      return returnTweetsFromCache(query, res);
    }

    return requestRemoteUserTimeline(query, res, credentials);
  });
};

const handleGetTweetsRequest = (req, res) => {
  return validateQueryParams(req)
  .then(query => {
    return oauthTokenProvider.getCredentials(req)
    .then(credentials => {
      return getTweets(query, res, credentials)
      .catch(err => {
        if (twitter.isQuotaLimitReachedError(err)) {
          logAndSendError(res, quotaLimitError, CONFLICT_ERROR);
        } else {
          logAndSendError(res, err.error, SERVER_ERROR);
        }
      });
    })
    .catch(error => logAndSendError(res, error, FORBIDDEN_ERROR));
  })
  .catch(error => logAndSendError(res, error, BAD_REQUEST_ERROR));
}

const validatePresentationQueryParams = (req) => {
  const {presentationId, componentId, hash, useDraft} = req.query;

  if (!presentationId) {
    return utils.validationErrorFor("Presentation id was not provided");
  }

  if (!componentId) {
    return utils.validationErrorFor("Component id was not provided");
  }

  if (!hash) {
    return utils.validationErrorFor("Hash was not provided");
  }

  if (!useDraft) {
    return utils.validationErrorFor("Use Draft was not provided");
  }

  return Promise.resolve({...req.query});
};

const handleGetPresentationTweetsRequest = (req, res) => {
  return validatePresentationQueryParams(req)
  .then(params => {
    const {presentationId, componentId, hash, useDraft} = params;

    return core.getPresentation(presentationId, componentId, hash, useDraft);
  })
  .then(presentation => {
    req.query = {...req.query, ...presentation};

    return handleGetTweetsRequest(req, res);
  })
  .catch(error => {
    if (error.message === "Not Found") {
      logAndSendError(res, error, NOT_FOUND_ERROR);
    } else if (error.message && error.message.indexOf("was not provided") >= 0) {
      logAndSendError(res, error, BAD_REQUEST_ERROR);
    } else {
      logAndSendError(res, error, SERVER_ERROR);
    }
  });
}

module.exports = {
  handleGetPresentationTweetsRequest
};
