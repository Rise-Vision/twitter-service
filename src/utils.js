const nodeFetch = require("node-fetch");

const currentTimestamp = () => Date.now();

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

module.exports = {
  currentTimestamp,
  deepClone,
  fetch: nodeFetch
};
