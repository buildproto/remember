var config = require('../../server/config.json');
var path = require('path');
var ig = require('instagram-node').instagram();
 
module.exports = function(userModel) {

  //send verification email after registration
  userModel.observe('after save', function(context, next) {
    if (context.isNewInstance) {
      console.log("models#user#observe#after save INSERTED");

      var user = context.instance;
      var userModel = user.constructor;
      if (userModel.settings.emailVerificationRequired) {
        var options = {
          type: 'email',
          to: user.email,
          from: 'click@buildproto.com',
          subject: 'Thanks for registering for Remember.',
          template: path.resolve(__dirname, '../../server/views/mailer/verify.ejs'),
          redirect: '/verified',
          user: user
        };

        user.verify(options, function(err, response) {
          if (err) return next(err);
          console.log('> verification email sent:', response);
          // no redirect/render here because we're in an 'after save' operation as opposed to
          // an on 'create' remote hook
        });
      }
      else {
        console.log("Email verification not required. Not sending email.");
      }
    } else {
      console.log("models#user#observe#after save UPDATED");
    }

    next();
  });

  //send password reset link when requested
  userModel.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    userModel.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });

  // remote method
  function findInstagramProfile(user, cb) {
    // The below modeled after passport-configurator.js
    user.identities(function(err, identities) {
      for (ident in identities) {
        var profile = identities[ident];
        if (profile.provider === 'instagram') {
          return cb(profile);
        }
      }

      // No identities found, check credentials
      user.credentials(function(err, accounts) {
        for (account in accounts) {
          var profile = accounts[account];
          if (profile.provider === 'instagram') {
            return cb(profile);
          }
        }
      });        
    });
  }

  function getSomeInstagramPhotos(token, cb) {
    var options = {
      access_token: token,
      client_id: 'f1e69a25ff1b4a53bae115134f260960',
      client_secret: '6e3bf9def997444fada84b98f0a61279'
    };
    ig.use(options);
    ig.user_self_media_recent(function(err, medias, pagination, remaining, limit) {
      console.log("err", err);
      console.log("medias", medias);
      console.log("pagination", pagination);
      console.log("remaining", remaining);
      console.log("limit", limit);
      cb(medias);
    });
  }

  userModel.prototype.instagramPhotos = function(cb) {
    var self = this;
    console.log("instagramPhotos: user", this);
    var userId = self.id;

    findInstagramProfile(self, function(profile) {
      if (profile) {
        console.log("found profile", profile);
        getSomeInstagramPhotos(profile.credentials.token, function(result) {
          cb(null, result);
        });
      }
      else {
        cb(null, "no instagram profile found");
      }
    });
  };

  userModel.remoteMethod(
    'instagramPhotos',
    {
      isStatic: false,
      description: "Get some Instagram photos for this user",
      http: {path:'/instagram-photos', verb: 'get'},
      accepts: [],
      returns: {arg: 'photos', type: 'string'}
    }
  );

};