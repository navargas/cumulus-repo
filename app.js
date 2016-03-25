var path = require('path');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var fstools = require('./lib/fstools');
var dbtools = require('./lib/dbtools');

var conf = {
  validName: /^[a-zA-Z0-9\-_\.]{1,120}$/,
  storageDir: '/var/asset-data/',
  dbFileName: 'metadata.sqlite'
}

var auth = require('./lib/auth').init(conf);

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
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.send('{"version": "v1.0.0"}');
});

app.use('/assets', require('./routes/assets.js').init(conf))
app.use('/groups', require('./routes/groups.js').init(conf))

/* Initialize database */
dbtools.create_tables(path.join(conf.storageDir, conf.dbFileName), function() {
  app.listen(process.env.serverport || 9090);
});
