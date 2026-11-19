// Lets async route handlers throw: errors go to the error handler instead of crashing/hanging.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { wrap };
