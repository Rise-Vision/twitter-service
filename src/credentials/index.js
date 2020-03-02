const constants = require('../constants');
const db = require("../redis-otp/api");
const twitter = require('../twitter');

const invalidInputError = new Error("Invalid input");

const { BAD_REQUEST_ERROR, SERVER_ERROR } = constants;

const validateQueryParams = (req) => {
  const {companyId} = req.query;
  if (!companyId) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve();
};

const handleError = (res, error, errorMessage) => {
  console.error(errorMessage, error);
  res.status(error === invalidInputError ? BAD_REQUEST_ERROR : SERVER_ERROR);
  res.send(error.message);
};

const handleVerifyCredentialsRequest = (req, res) => {
  return validateQueryParams(req)
    .then(() => db.getCredentials(req))
    .then(twitter.verifyCredentials)
    .then(() => {
      res.json({success: true});
    })
    .catch(error => {
      if (isExpectedError(error)) {
        return res.json({
          success: false,
          message: error.message
        })
      }

      handleError(res, error, "Error when verifying credentials");
    });
};

const isExpectedError = err => {
  return (err.message && err.message.includes("No credentials for")) ||
    twitter.isInvalidOrExpiredTokenError(err);
};

module.exports = {
  handleVerifyCredentialsRequest
};
