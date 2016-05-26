var config = require('../../server/config.json');
var path = require('path');
 
module.exports = function(user) {

  //send verification email after registration
  user.observe('after save', function(context, next) {
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
  user.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    user.app.models.Email.send({
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
  user.instagramPhotos = function(userId, cb) {
    var photos = "this is a test";
    cb(null, photos)
  };
  user.remoteMethod(
    'instagramPhotos',
    {
      accepts: [{arg: 'userId', type: 'string'}],
      returns: {arg: 'photos', type: 'string'},
      http: {path:'/instagram-photos', verb: 'post'}
    }
  );

};