var path = require('path');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var fstools = require('./lib/fstools');
var dbtools = require('./lib/dbtools');
var synchronize = require('./lib/synchronize.js');

var conf = {
  validName: /^[a-zA-Z0-9\-_\.]{1,120}$/,
  storageDir: '/var/asset-data/',
  dbFileName: 'metadata.sqlite'
};

var auth = require('./lib/auth').init(conf);

if (process.argv.length < 3) {
  /* conf file should contain an array of server hostnames */
  console.error('usage: node app.js /path/to/mirrors.json');
  console.error('       node app.js NO_MIRRORS');
  process.exit(1);
} else if (process.argv[2] != 'NO_MIRRORS') {
  synchronize.generateMirrorList(process.argv[2]);
}

/* Initialize directory */
fstools.format_directory(conf.storageDir, conf.dbFileName);

var sessionOpts = {
  secret: process.env.sessionsecret || '5451d0c801584d04b073f1de9be81e8b',
  resave: false,
  rolling: true,
  cookie: {maxAge:60*60*1000},
  saveUninitialized: false
};

var app = express();

/* Avoid crash on uncaughtException */
process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Exit prevented");
});

/* If this instance is being synced from elsewhere, only allow GET requests */
if (process.env.CUMULUS_SOURCE) {
  app.use(auth.disableModification);
};

app.use(synchronize.delayRequestIfBusy);

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.send('{"version": "v1.0.0"}');
});

app.use(function(req, res, next) {
  var url = req.originalUrl;
  var sendChange = (req.method == 'POST' || req.method == 'PUT');
  var op = new synchronize.ActiveOperation(req.method + ' ' + url, sendChange);
  afterRequest = function() {
    res.removeListener('finish', afterRequest);
    var doNotReplicate = (res.statusCode != 200);
    op.end(doNotReplicate);
  };
  res.on('finish', afterRequest);
  next();
});

app.use('/assets', require('./routes/assets.js').init(conf));
app.use('/groups', require('./routes/groups.js').init(conf));
app.use('/synchronize', synchronize.router);


/* Initialize database */
dbtools.create_tables(path.join(conf.storageDir, conf.dbFileName), function() {
  app.listen(process.env.serverport || 9090);
});
