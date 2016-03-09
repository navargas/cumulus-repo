var express = require('express');
var sqlite = require('sqlite3');
var auth = require('../lib/auth.js');
var router = express.Router();

/* Initialized in init(...) */
var conf = null;
var db = null;

router.get('/', function(req, res) {
  res.send('{"index":"yes"}');
});

router.put('/:assetName', auth.verify, function(req, res) {
  res.send({'_request-for':req.authenticatedUser});
});

exports.init = function(configuration) {
  conf = configuration;
  return router;
}
