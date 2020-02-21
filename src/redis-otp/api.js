const redis = require("./datastore");

const getKeys = (companyId) => {
  return redis.getSet(`${companyId}:twitter`);
};

const getCredentialsVal = key => {
  return redis.getString(key)
    .then(stringCredentials => JSON.parse(stringCredentials));
};

const getCredentials = (req) => {
  const {companyId} = req.query;
  let key = null;

  return getKeys(companyId)
    .then(keys => {
      if (!keys || keys.length === 0) {
        return Promise.reject(new Error(`No credentials for: ${companyId}:twitter`));
      }

      key = `${companyId}:twitter:${keys[0]}`;

      return getCredentialsVal(key);
    })
    .then(credentials=>{
      if (!credentials) {
        throw new Error(`Could not read credentials for: ${key}`);
      }

      return Promise.resolve(credentials);
    });
};

module.exports = {
  getCredentials
};
