'use strict';
console.log('boot#autoupdatedb Ensuring database schema in sync...');

module.exports = function(app, callback) {
  var ds = app.dataSources.db;

  var performMigration = function(app, ds) {
    var models = app.models();
    var modelNames = [];
    models.forEach(function(Model) {
      if (Model.dataSource == ds) {
        console.log('boot#autoupdatedb adding db model:', Model.modelName);
        modelNames.push(Model.modelName);
      } else {
        console.log('boot#autoupdatedb skipping model:', Model.modelName);
      }
    });
    ds.isActual(modelNames, function(err, actual) {
      if (err) {
        console.log('boot#autoupdatedb isActual error:', err, 'HALTING STARTUP');
        throw err;
      }
      if (!actual) {
        ds.autoupdate(modelNames, function (err) {
          if (err) {
            console.log('boot#autoupdatedb error:', err, 'HALTING STARTUP');
            throw err;
          }
          console.log('boot#autoupdatedb migration complete.');
          callback();
        });
      } else {
        console.log('boot#autoupdatedb no model changes detected.');
        callback();
      }
    });
  };

  if (ds.connected) {
    console.log('boot#autoupdatedb already connected to db, proceeding...');
    performMigration(app, ds);
  } else {
    console.log('boot#autoupdatedb not yet connected to db, waiting...');
    ds.once('connected', function() {
      console.log('boot#autoupdatedb now connected to db, proceeding...');
      performMigration(app, ds);
    });
  }
  // ^ Per: https://github.com/strongloop/loopback/issues/1186#issuecomment-111934355
};
