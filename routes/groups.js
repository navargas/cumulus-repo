var express = require('express');
var path = require('path');
var sqlite = require('sqlite3');
var auth = require('../lib/auth.js');
var router = express.Router();

/* Initialized in init(...) */
var conf = null;
var db = null;

var SQL_ADD_NEW_GROUP = 'INSERT INTO groups (name, owner) VALUES (?, ?)';

router.get('/', function(req, res) {
  res.send('{"index":"yes"}');
});

router.put('/:groupName', auth.verify, function(req, res) {
  var name = req.params.groupName;
  var owner = req.authenticatedUser;
  if (!conf.validName.test(name)) {
    return res.status(400).send({error: 'Invalid name'});
  }
  db.run(SQL_ADD_NEW_GROUP, [name, owner], function(err) {
    if (err) return res.status(500).send({error: err.toString()});
    res.send({status:'success', group:name, owner:owner});
  });
});

exports.init = function(configuration) {
  conf = configuration;
  db = new sqlite.Database(path.join(conf.storageDir, conf.dbFileName));
  return router;
}
