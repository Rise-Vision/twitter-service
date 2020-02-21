const db = require("../redis-otp");
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
  validateQueryParams(req)
    .then(() => db.getCredentials(req, res))
    .then(credentials => {
      // temporarily respond with success
      res.json({success: true});

      // TODO: validate credentials
    })
    .catch(error=>{
      if (error.message.includes("No credentials for")) {
        return res.json({
          success: false,
          message: error.message
        })
      }

      handleError(res, error, "Error when verifying credentials");
    });
}

module.exports = {
  handleVerifyCredentialsRequest
};
