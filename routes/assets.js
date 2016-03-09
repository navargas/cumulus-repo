var express = require('express');
var sqlite = require('sqlite3');
var router = express.Router();

var conf = null; // Initialized in init(...)

router.get('/', function(req, res) {
  res.send('{"index":"yes"}');
});

router.put('/', function(req, res) {
  res.send('{"index":"yes, put"}');
});

module.exports.init = function(configuration) {
  conf = configuration;
  return router;
}
