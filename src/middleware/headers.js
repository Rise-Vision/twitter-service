const setHeaders = (req, res, next) => {
  if (req && req.headers && req.headers.origin) {
    console.log(`CORS origin: ${req.headers.origin}`);
  }

  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", true);
  next();
};

module.exports = {
  setHeaders
};
