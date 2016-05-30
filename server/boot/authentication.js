// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: loopback-example-passport
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

module.exports = function enableAuthentication(server) {
  // enable authentication
  server.enableAuth();

  var loopback = require('loopback');
  server.middleware('auth', loopback.token({
  	model: server.models.accessToken,
  	currentUserLiteral: 'me'
  }));
  
};
