var loopback = require('loopback');

module.exports = function ensureLoggedIn(options) {
  if (typeof options == 'string') {
    options = { redirectTo: options }
  }
  options = options || {};
  
  var url = options.redirectTo || '/login';
  var setReturnTo = (options.setReturnTo === undefined) ? true : options.setReturnTo;
  
  return function(req, res, next) {
	var context = loopback.getCurrentContext();
	if (!context.get('currentUser')) {
	  if (setReturnTo && req.session) {
	    req.session.returnTo = req.originalUrl || req.url;
	  }
	  return res.redirect(url);
	}
	else {
	  next();
	}
  }
}