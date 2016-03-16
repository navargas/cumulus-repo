var sqlite = require('sqlite3');
var path = require('path');

/* Initialized in init(...) */
var conf = null;
var db = null;

var SQL_GET_SESSION = "SELECT * FROM keys WHERE key = (?);"
var SQL_DELETE_SESSION = "DELETE FROM keys WHERE key = (?);"
var SQL_GET_ASSET = 'SELECT name FROM assets WHERE name = (?);'

exports.sessionStatus = function(req, callback) {
  /* Check for api key information in the header */
  if (!req.headers || !req.headers['x-api-key']) {
    if (callback) return callback({error: 'X-API-KEY header data missing'});
  }
  getSession = db.prepare(SQL_GET_SESSION);
  getSession.get(req.headers['x-api-key'], function(err, keyObj) {
    getSession.finalize();
    if (err) {
      /* If the query does not complete successfully */
      console.error(err);
      if (callback) return callback({error: 'Auth key database error'});
    }
    if (!keyObj) {
      /* If no results are fetched from the database */
      if (callback) return callback({error: 'Invalid session'});
    }
    if (keyObj.expire && keyObj.expire < Date.now()) {
      /* If session is expired, delete it. If there is no expiration
         time, default to "valid" */
      deleteSession = db.prepare(SQL_DELETE_SESSION);
      deleteSession.run(req.headers['x-api-key'], function(err, data) {
        if (err) console.error(err);
      });
      deleteSession.finalize();
      if (callback) return callback({error: 'Session expired'});
    }
    req.authenticatedUser = keyObj.owner;
    if (callback) return callback({user: keyObj.owner});
  });
};

exports.verify = function(req, res, next) {
  /* Middleware adapter for sessionStatus(...)
     calls next() if sessionStatus does not contain and error,
     otherwise sends the error to the user */
  exports.sessionStatus(req, function(stat) {
    if (stat.error) {
      res.send(stat);
      res.end();
    } else {
      next();
    }
  });
};

exports.verifyAssetExists = function(req, res, next) {
  getAsset = db.prepare(SQL_GET_ASSET);
  getAsset.get(req.params.assetName, function(err, data) {
    if (err || !data) {
      return res.send({error: 'Asset does not exist'});
    }
    next();
  });
}

exports.init = function(configuration) {
  conf = configuration;
  db = new sqlite.Database(path.join(conf.storageDir, conf.dbFileName));
  return exports;
}
