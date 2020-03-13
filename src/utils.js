const currentTimestamp = () => new Date().getTime();

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

module.exports = {
  currentTimestamp,
  deepClone
};
