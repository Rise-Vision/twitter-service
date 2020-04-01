const hash = require("object-hash");
const nodeFetch = require("node-fetch");

const currentTimestamp = () => Date.now();
const validationErrorFor = message => Promise.reject(new Error(message));

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

module.exports = {
  currentTimestamp,
  validationErrorFor,
  deepClone,
  hash,
  fetch: nodeFetch
};
