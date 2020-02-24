const db = require("../redis-otp/api");
const twitter = require('../twitter');

const invalidInputError = new Error("Invalid input");

const CLIENT_ERROR = 400;
const SERVER_ERROR = 500;

const validateQueryParams = (req) => {
  const {companyId} = req.query;
  if (!companyId) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve();
};

const handleError = (res, error, errorMessage) => {
  console.log(errorMessage, error);
  res.status(error === invalidInputError ? CLIENT_ERROR : SERVER_ERROR);
  res.send(error.message);
};

const handleVerifyCredentialsRequest = (req, res) => {
  return validateQueryParams(req)
    .then(() => db.getCredentials(req, res))
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
}

const isExpectedError = err => {
  return err.message && (err.message.includes("No credentials for") || err.message === "Invalid or expired token.");
}

module.exports = {
  handleVerifyCredentialsRequest
};
