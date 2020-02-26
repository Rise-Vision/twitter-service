const constants = require('../constants');
const oauthTokenProvider = require("../redis-otp/api");
const twitter = require('../twitter');

const { FORBIDDEN_ERROR, SERVER_ERROR } = constants;

const logAndSendError = (res, error, status) => {
  console.error(error);

  res.status(status);
  res.send(error.message);
};

const getUserTimeline = (req, res, credentials) => {
  return twitter.getUserTimeline(credentials, req.query.username)
  .then(timeline => {
    res.json({
      tweets: timeline
    });
  })
  .catch(error => {
    logAndSendError(res, error, SERVER_ERROR);
  });
};

const handleGetTweetsRequest = (req, res) => {
  // TODO parameter validation in next card

  return oauthTokenProvider.getCredentials(req)
    .then(() => getUserTimeline(req, res, credentials))
    .catch(error => logAndSendError(res, error, FORBIDDEN_ERROR));
}

const isCredentialsNotFound = err => {
  return err.message && err.message.includes("No credentials for");
};

module.exports = {
  handleGetTweetsRequest
};
