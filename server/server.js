// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-example-passport
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var loopback = require('loopback');
var boot = require('loopback-boot');
var app = module.exports = loopback();

// Passport configurators..
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
var bodyParser = require('body-parser');

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
var flash      = require('express-flash');

// attempt to build the providers/passport config
var config = {};
try {
  config = require('../providers');
} catch (err) {
  console.trace(err);
  process.exit(1); // fatal
}

// -- Add your pre-processing middleware here --

// Setup the view engine (jade)
var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// boot scripts mount components like REST API
boot(app, __dirname);

// to support JSON-encoded bodies
app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
app.middleware('parse', bodyParser.urlencoded({
  extended: true
}));



// Establish current user from access token
app.use(loopback.context());
app.use(function setCurrentUser(req, res, next) {
    if (!req.accessToken) {
        return next();
    }
    app.models.Person.findById(req.accessToken.userId, function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new Error('No user with this access token was found.'));
        }

        // NOTE: This section is pulled from passport-configurator.js
        // sorry.
        user.identities(function(err, identities) {
          user.profiles = identities;
          user.credentials(function(err, accounts) {
            user.accounts = accounts;

            // Set this user on the current context
            var loopbackContext = loopback.getCurrentContext();
            if (loopbackContext) {
                req.accessToken.currentUser = user;
                loopbackContext.set('currentUser', user);
            }
            req.user = user;
            // ^ didn't see examples doing this, but couldn't find a better way

            next();

          });
        });


    });
});


app.middleware('session:before', loopback.cookieParser(app.get('cookieSecret')));
app.middleware('session', loopback.session({
  secret: 'kitty',
  saveUninitialized: true,
  resave: true
}));

// REF: http://blog.digitopia.com/tokens-sessions-users/
// use loopback.token middleware on all routes
// setup gear for authentication using cookie (access_token)
// Note: requires cookie-parser (defined in middleware.json)
app.use(loopback.token({  
  model: app.models.accessToken,
  currentUserLiteral: 'me',
  searchDefaultTokenKeys: false,
  cookies: ['access_token'],
  headers: ['access_token', 'X-Access-Token'],
  params: ['access_token']
}));

// We need flash messages to see passport errors
app.use(flash());

passportConfigurator.init();

passportConfigurator.setupModels({
  userModel: app.models.person,
  userIdentityModel: app.models.userIdentity,
  userCredentialModel: app.models.userCredential
});
for (var s in config) {
  var c = config[s];
  c.session = c.session !== false;
  passportConfigurator.configureProvider(s, c);
}

var ensureLoggedIn = require('./middleware/ensure-logged-in');
// ^ This is our custom loopback ensure-logged-in.

app.get('/', function (req, res, next) {
  if (req.user) {
    res.render('pages/landing', {
      user: req.user,
      url: req.url
    });    
  }
  else
  {
    res.render('pages/index', {user:
      req.user,
      url: req.url
    });
  }
});

app.get('/auth/account', ensureLoggedIn('/login'), function (req, res, next) {
  res.render('pages/loginProfiles', {
    user: req.user,
    url: req.url
  });
});

app.get('/local', function (req, res, next){
  res.render('pages/local', {
    user: req.user,
    url: req.url
  });
});

app.get('/signup', function (req, res, next){
  res.render('pages/signup', {
    user: req.user,
    url: req.url
  });
});

app.post('/signup', function (req, res, next) {

  var Person = app.models.person;

  var newPerson = {};
  newPerson.email = req.body.email.toLowerCase();
  newPerson.username = req.body.username.trim();
  newPerson.password = req.body.password;

  Person.create(newPerson, function (err, person) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    } else {
      // Passport exposes a login() function on req (also aliased as logIn())
      // that can be used to establish a login session. This function is
      // primarily used when users sign up, during which req.login() can
      // be invoked to log in the newly registered user.
      req.login(person, function (err) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        return res.redirect('/auth/account');
      });
    }
  });
});

app.get('/verified', function (req, res, next){
  console.log('> verified req', req);
  req.flash('success', "You're email is confirmed. You can now log in!")
  res.render('pages/verified');
});

app.get('/login', function (req, res, next){
  res.render('pages/login', {
    user: req.user,
    url: req.url
   });
});

app.get('/auth/logout', function (req, res, next) {
    if (!req.accessToken) return res.sendStatus(401); //return 401:unauthorized if accessToken is not present
    app.models.person.logout(req.accessToken.id, function(err) {
      if (err) return next(err);
      // Clear the session cookies
      res.clearCookie('access_token');
      res.clearCookie('userId');
      res.redirect('/'); //on successful logout, redirect
    });
});


app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
