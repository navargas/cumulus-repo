/*
 *  lib/replicate.js
 *  ----------------
 *
 *  Reissue REST commands accross all mirrors. Commands are processed in the
 *  order that they complete on the host.
 *
 */

var poster = require('poster');
var fs = require('fs');

transactionQueue = [];
mirrorList = [];
failedTransactions = [];

/*  generateMirrorList(confFile)
 *  Generate list of mirror servers from a json file
 */
exports.generateMirrorList = function(confFile) {
  mirrorList = JSON.parse(fs.readFileSync(confFile, 'utf8'));
}

/*  queueAdd(request, response)
 *  Add an item to the transaction queue
 */
exports.queueAdd = function(request, response) {
  var method = request.method;
  var url = request.originalUrl;
  // ignore read only targets
  if (method == 'GET' || method == 'HEAD') return;
  // ignore failed requests
  if (response.statusCode != 200) return;
  transactionQueue.push([request, response]);
}

function uploadFileToRemoteServer(url, filename, cb) {
  var options = {
    uploadUrl: url,
    method: 'POST',
    fileId: 'upload'
  };
  poster.post(filename, options, cb);
}

function transactionFault(transaction, destination, error) {
  var request = transaction[0];
  var method = request.method;
  var url = request.originalUrl;
  failedTransactions.push(transaction);
  console.error(
    'Transaction Fault ',
    failedTransactions.length,
    ' to ',
    destination
  );
  console.error('\t' + method, ' ', url);
  console.error(error);
  console.error('\tEND');
}

function replicateTransaction(transaction) {
  var request = transaction[0];
  var method = request.method;
  var url = request.originalUrl;
  var transferFile = request.localFileSource;
  console.log('duplicating', method, url, transferFile);
  for (var index in mirrorList) {
    destination = mirrorList[index];
    if (transferFile) {
      uploadFileToRemoteServer(destination, transferFile, function(err, resp) {
        if (err) transactionFault(transaction, destination, err);
      });
    }
  }
}

setInterval(function() {
  var currentTransaction = transactionQueue.shift();
  if (!currentTransaction) return;
  replicateTransaction(currentTransaction);
}, 1000 * 1);
