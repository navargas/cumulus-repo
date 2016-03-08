var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.send('{"index":"yes"}');
});

router.put('/', function(req, res) {
  res.send('{"index":"yes, put"}');
});

module.exports = router;
