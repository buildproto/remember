var config = require('../../server/config.json');
var path = require('path');
var ig = require('instagram-node').instagram();
 
module.exports = function(personModel) {

  //send verification email after registration
  personModel.observe('after save', function(context, next) {
    if (context.isNewInstance) {
      console.log("models#person#observe#after save INSERTED");

      var person = context.instance;
      var personModel = person.constructor;
      if (personModel.settings.emailVerificationRequired) {
        var options = {
          type: 'email',
          to: person.email,
          from: 'click@buildproto.com',
          subject: 'Thanks for registering for Remember.',
          template: path.resolve(__dirname, '../../server/views/mailer/verify.ejs'),
          redirect: '/verified',
          user: person
        };

        person.verify(options, function(err, response) {
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
      console.log("models#person#observe#after save UPDATED");
    }

    next();
  });

  //send password reset link when requested
  personModel.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    personModel.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });


  // ANOTHER TEST
  personModel.afterRemote('create', function(ctx, result, next) {
    console.log("afterRemote#create");
    next();
  });
  // END ANOTHER TEST


  // remote method
  function findInstagramProfile(person, cb) {
    // The below modeled after passport-configurator.js
    person.identities(function(err, identities) {
      for (ident in identities) {
        var profile = identities[ident];
        if (profile.provider === 'instagram') {
          return cb(profile);
        }
      }

      // No identities found, check credentials
      person.credentials(function(err, accounts) {
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
      // ^ "Remember" sandboxed keys
      //client_id: process.env.INSTAGRAM_CLIENT_ID,
      //client_secret: process.env.INSTAGRAM_CLIENT_SECRET
      // ^ Pictli key
    };
    console.log("options", options);
    ig.use(options);

    var result = [];
    var hdl = function(err, medias, pagination, remaining, limit) {
      // Your implementation here 
      console.log("err", err);
      console.log("medias length", medias.length);
      console.log("pagination", pagination);
      console.log("remaining", remaining);
      console.log("limit", limit);
      result = result.concat(medias);

      if(pagination.next) {
        pagination.next(hdl); // Will get second page results 
      }
      else {
        cb(result);
      }
    };

    var mediaOptions = {
      count: 50
    }
    ig.user_media_recent('11752850', mediaOptions, hdl);
  }

  personModel.prototype.instagramPhotos = function(cb) {
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

  personModel.remoteMethod(
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