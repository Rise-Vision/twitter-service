const setCorsHeaders = (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", true);
};

const setHstsHeader = (res) => {
  res.header("Strict-Transport-Security", "max-age=31536000");
};

const setHeaders = (req, res, next) => {
  setCorsHeaders(req, res);
  setHstsHeader(res);

  next();
};

module.exports = {
  setHeaders
};
