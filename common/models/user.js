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
  userModel.prototype.instagramPhotos = function(cb) {
    console.log("instagramPhotos: user", this);
    var userId = this.id;
    cb(null, "this is a test");
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