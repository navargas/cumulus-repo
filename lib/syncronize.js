exports.busy = false;
exports.requestQueue = [];

exports.delayRequestIfBusy = function(req, res, next) {
  /* If busy is set, queue requests rather than executing them */
  var urlBase = req.originalUrl.split('/')[1];
  if (exports.busy && urlBase != 'synchronize') {
    exports.requestQueue.push(next);
  } else {
    next();
  }
};

var express = require('express');
var router = express.Router();

router.post('/pause', function(req, res) {
  exports.busy = true;
  res.send({status:'ok'});
});

router.post('/resume', function(req, res) {
  var request = exports.requestQueue.shift();
  for (; request; request=exports.requestQueue.shift()) {
    request();
  }
  exports.busy = false;
  res.send({status:'ok'});
});

exports.router = router;
