var sqlite = require('sqlite3');
var path = require('path');

/* Initialized in init(...) */
var conf = null;
var db = null;

var SQL_GET_SESSION = "SELECT * FROM keys WHERE key = (?);"
var SQL_DELETE_SESSION = "DELETE FROM keys WHERE key = (?);"

exports.sessionStatus = function(req, callback) {
  if (!req.headers || !req.headers['x-api-key']) {
    if (callback) callback({error: 'X-API-KEY header data missing'});
    return;
  }
  getSession = db.prepare(SQL_GET_SESSION);
  getSession.get(req.headers['x-api-key'], function(err, keyObj) {
    getSession.finalize();
    if (err) {
      console.error(err);
      if (callback) callback({error: 'Auth keyObjbase error'});
      return;
    }
    if (!keyObj) {
      if (callback) callback({error: 'Invalid session'});
      return;
    }
    if (keyObj.expire && keyObj.expire < Date.now()) {
      /* If session is expired, delete it */
      deleteSession = db.prepare(SQL_DELETE_SESSION);
      deleteSession.run(req.headers['x-api-key'], function(err, data) {
        if (err) console.error(err);
      });
      deleteSession.finalize();
      if (callback) callback({error: 'Session expired'});
      return;
    }
    req.authenticatedUser = keyObj.owner;
    if (callback) callback({user: keyObj.owner});
    return;
  });
};

exports.verify = function(req, res, next) {
  exports.sessionStatus(req, function(stat) {
    if (stat.error) {
      res.send(stat);
      res.end();
    } else {
      next();
    }
  });
};

exports.init = function(configuration) {
  conf = configuration;
  db = new sqlite.Database(path.join(conf.storageDir, conf.dbFileName));
  return exports;
}
