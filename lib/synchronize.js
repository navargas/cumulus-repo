var fmt = require('util').format;
var querystring = require('querystring');
var fs = require('fs');
var http = require('http');
var spawn = require('child_process').spawn;
var dbtools = require('../lib/dbtools.js');

var sync = '-e ssh -a --delete /var/asset-data/ %s:/var/asset-data/ -v';
var wrote_to_stdout = false;
var activeOperations = [];
var mirrorList = [];

exports.busy = false;
exports.requestQueue = [];

/*  generateMirrorList(confFile)
 *  Generate list of mirror servers from a json file
 */
exports.generateMirrorList = function(confFile) {
  mirrorList = JSON.parse(fs.readFileSync(confFile, 'utf8'));
  /* check mirrorList formatting */
  for (var index in mirrorList) {
    if (typeof mirrorList != 'object' ||
        mirrorList[index].length != 3 ||
        typeof mirrorList[index][0] != 'string' ||
        typeof mirrorList[index][1] != 'string') {
      console.error('Formatting error in', confFile);
      process.exit(1);
    }
  }
}

exports.delayRequestIfBusy = function(req, res, next) {
  /* If busy is set, queue requests rather than executing them */
  var urlBase = req.originalUrl.split('/')[1];
  if (exports.busy && urlBase != 'synchronize') {
    exports.requestQueue.push(next);
  } else {
    next();
  }
};

/*  resetRemote(hostname, port)
 *  Refresh database connection after replicating to remote machine.
 */
function resetRemote(hostname, port) {
  var postData = querystring.stringify({
    cluster:process.env.CUMULUS_CLUSTER
  });
  var httpReq = {
    hostname: hostname,
    port: port,
    method: 'POST',
    path: '/synchronize/resetdb',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
  /* send http post to hostname:port */
  var req = http.request(httpReq, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
    });
    res.on('end', function() {
      console.log('Status:', res.statusCode);
    })
  });
  req.write(postData);
  req.end();
}

function attemptSync (machine, hostname, port) {
  /* if there are no active operations, synchronize to mirrors */
  if (activeOperations.length == 0) {
    /* run sync */
    var command = fmt(sync, machine);
    var syncCmd = spawn('rsync', command.split(' '));
    syncCmd.stderr.on('data', function(data) {
      console.error(data.toString('utf8'));
    });
    syncCmd.on('close', function(code) {
      console.log('Sync finished with code', code);
      if (code === 0) resetRemote(hostname, port);
    });
  }
};

if (!process.env.CUMULUS_MASTER) {
  /* only the master node can send changes */
  attemptSync = function() {};
}

exports.syncAll = function() {
  for (var index in mirrorList) {
    var mirror = mirrorList[index];
    console.log('Sync', mirror);
    attemptSync(mirror[0], mirror[1], mirror[2]);
  }
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
    if (this.propogateChange && !doNotReplicate) exports.syncAll();
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

router.post('/resetdb', function(req, res) {
  if (req.body.cluster != process.env.CUMULUS_CLUSTER) {
    return res.status(403).send({status:'not allowed'});
  }
  dbtools.reset();
  res.send({status:'ok'});
});

exports.router = router;
