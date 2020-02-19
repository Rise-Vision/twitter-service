const db = require("../redis-otp");
const invalidInputError = new Error("Invalid input");

const CLIENT_ERROR = 400;
const SERVER_ERROR = 500;

const getCredentials = (companyId, id) => {
  const key = `${companyId}:twitter:${id}`;

  return db.getCredentials(key)
    .then(credentials => {
      if (!credentials) {
        throw new Error(`Could not read credentials for: ${key}`);
      }

      return Promise.resolve(credentials);
    });
};

const validateStatusBody = (req) => {
  const body = req.body;
  if (!body || !body.companyId) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve(req);
};

const handleError = (res, error, errorMessage) => {
  console.log(errorMessage, error);
  res.status(error === invalidInputError ? CLIENT_ERROR : SERVER_ERROR);
  res.send(error.message);
};

const handleVerifyCredentialsRequest = (req, res) => {
  validateStatusBody(req)
    .then(db.checkKey)
    .then(keys=>{
      const companyId = req.body.companyId;

      if (!keys || keys.length === 0) {
        return Promise.reject(new Error(`No credentials for: ${companyId}:twitter`));
      }

      return getCredentials(companyId, keys[0]);
    })
    .then((credentials) => {
      // TODO: validate credentials

      // temporarily respond with success
      res.json({success: true});
    })
    .catch(error=>{
      if (error.message.includes("No credentials")) {
        return res.json({
          success: false,
          message: error.message
        });
      }

      handleError(res, error, "Error when verifying credentials");
    });
}

module.exports = {
  handleVerifyCredentialsRequest
};
