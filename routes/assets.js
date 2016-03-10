var path = require('path');
var express = require('express');
var sqlite = require('sqlite3');
var auth = require('../lib/auth.js');
var router = express.Router();

/* Initialized in init(...) */
var conf = null;
var db = null;

/* SQL Statements */
var SQL_GET_ASSETS_NO_PERMISSIONS = 'SELECT name, owner, description ' +
                                    'FROM assets LIMIT 50;';
var SQL_NEW_ASSET = 'INSERT INTO assets (name, owner, description) ' +
                    'VALUES (?, ?, ?);';

router.get('/', function(req, res) {
  db.all(SQL_GET_ASSETS_NO_PERMISSIONS, function (err, data) {
    if (err) {
      console.error(err.toString());
      res.send({error:err.toString()});
    } else {
      res.send(data);
    }
  });
});

router.put('/:assetName', auth.verify, function(req, res) {
  /* Add new asset named assetName */
  var description = req.body.desc || '';
  var newAsset = db.prepare(SQL_NEW_ASSET);
  var record = [req.params.assetName, req.authenticatedUser, description];
  if (!conf.validName.test(record[0])) {
    return res.send({error: 'Invalid name'});
  }
  newAsset.run(record, function(err, data) {
    if (err) {
      res.send({error:err.toString()});
    } else {
      res.send({owner:record[1], name:record[0]});
    }
  });
});

exports.init = function(configuration) {
  conf = configuration;
  db = new sqlite.Database(path.join(conf.storageDir, conf.dbFileName));
  return router;
}
