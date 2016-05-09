var fmt = require('util').format;
var spawn = require('child_process').spawn;

var sync = '-e ssh -a --delete /var/asset-data/ %s:/var/asset-data/ -v';
var ssht = '%s curl -X POST localhost:9090/syncronize/pause'
var wrote_to_stdout = false;
var activeOperations = [];

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

exports.attemptSync = function() {
  /* if there are no active operations, synchronize to mirrors */
  if (activeOperations.length == 0) {
    /* run sync */
    var command = fmt(sync, 'dal09');
    console.log('Starting sync operation', command);
    var syncCmd = spawn('rsync', command.split(' '));
    syncCmd.stderr.on('data', function(data) {
      console.error(data.toString('utf8'));
    });
    syncCmd.on('close', function(code) {
      console.log('Sync finished with code', code);
    });
  }
};

if (!process.env.CUMULUS_MASTER) {
  /* only the master node can send changes */
  exports.attemptSync = function() {};
}

exports.pause = function() {
  /* prevent new requests from continuing */
  exports.busy = true;
};

exports.resume = function() {
  /* resume requests in case they have not already timed out */
  var request = exports.requestQueue.shift();
  for (; request; request=exports.requestQueue.shift()) {
    request();
  }
  exports.busy = false;
};

exports.ActiveOperation = function(description, propogateChange) {
  /* prevent synchronization when operations are in progress */
  this.description = description;
  this.started = Date.now();
  this.propogateChange = propogateChange;

  this.end = function(doNotReplicate) {
    activeOperations.splice(activeOperations.indexOf(this), 1);
    if (activeOperations.length == 0 && wrote_to_stdout) {
      wrote_to_stdout = false;
      console.log('All operations finished');
    }
    if (this.propogateChange && !doNotReplicate) exports.attemptSync();
  };

  activeOperations.push(this);
  return this;
};

setInterval(function() {
  /* monitor active operations, report ones that are long running */
  if (activeOperations.length == 0) return;
  console.log(fmt('%s active operations', activeOperations.length));
  for (var index in activeOperations) {
    var created = activeOperations[index].started;
    var alive = Math.round((Date.now() - created) / 1000 / 60); // in minutes
    var description = activeOperations[index].description;
    console.log('%s: active for %d minutes', description, alive);
    wrote_to_stdout = true;
  }
}, 1000 * 30);

var express = require('express');
var router = express.Router();

router.post('/pause', function(req, res) {
  if (req.body.cluster != process.env.CUMULUS_CLUSTER) {
    return res.status(403).send({status:'not allowed'});
  }
  exports.pause();
  res.send({status:'ok'});
});

router.post('/resume', function(req, res) {
  if (req.body.cluster != process.env.CUMULUS_CLUSTER) {
    return res.status(403).send({status:'not allowed'});
  }
  exports.resume();
  res.send({status:'ok'});
});

exports.router = router;
