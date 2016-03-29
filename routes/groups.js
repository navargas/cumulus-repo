var express = require('express');
var path = require('path');
var sqlite = require('sqlite3');
var auth = require('../lib/auth.js');
var router = express.Router();

/* Initialized in init(...) */
var conf = null;
var db = null;

var SQL_ADD_NEW_GROUP = 'INSERT INTO groups (name, owner) VALUES (?, ?)';
var SQL_GET_GROUPS = 'SELECT name, owner FROM groups LIMIT 50';
var SQL_ADD_USER = "INSERT INTO groupUsers (groupName, userName) VALUES (?, ?)";

router.get('/', function(req, res) {
  /* Return a list of all groups (limit 50) */
  db.all(SQL_GET_GROUPS, function(err, data) {
    if (err) return res.status(500).send({error: err.toString()});
    res.send(data);
  });
});

router.delete('/:groupName', auth.verify, function(req, res) {
  /* deleting a group will not delete assets */
  var SQL_DELETE_GROUP =
    'DELETE FROM groups WHERE name = ?';
  var SQL_REMOVE_ASSET_RECORDS =
    'DELETE FROM groupAssets WHERE groupName = ?';
  var SQL_REMOVE_GROUP_MEMEBERS =
    'DELETE FROM groupUsers WHERE groupName = ?';
  db.run(SQL_DELETE_GROUP, [req.params.groupName], function (err) {
    if (err) return res.status(500).send({error:err.toString()});
    res.send({status:'ok'});
  });
});

router.put('/:groupName', auth.verify, function(req, res) {
  /* Create a new group */
  var name = req.params.groupName;
  var owner = req.authenticatedUser;
  if (!conf.validName.test(name)) {
    return res.status(400).send({error: 'Invalid name'});
  }
  db.run(SQL_ADD_NEW_GROUP, [name, owner], function(err) {
    if (err) return res.status(500).send({error: err.toString()});
    db.run(SQL_ADD_USER, [name, owner], function(memberErr) {
      if (memberErr) return res.status(500).send({error: memberErr.toString()});
      res.send({status:'success', group:name, owner:owner});
    });
  });
});

exports.init = function(configuration) {
  conf = configuration;
  db = new sqlite.Database(path.join(conf.storageDir, conf.dbFileName));
  db.run('PRAGMA foreign_keys = ON');
  return router;
}
