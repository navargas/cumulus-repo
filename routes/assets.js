var path = require('path');
var fs = require('fs');
var express = require('express');
var multer = require('multer');
var sqlite = require('sqlite3');
var auth = require('../lib/auth.js');
var router = express.Router();


/* Initialized in init(...) */
var conf = null;
var db = null;

/* SQL Statements */
var SQL_GET_ASSETS_NO_PERMISSIONS = 'SELECT name, owner, description ' +
                                    'FROM assets LIMIT 50;';
var SQL_GET_ASSET_BY_NAME = 'SELECT name, owner, description ' +
                                    'FROM assets WHERE name = (?);';
var SQL_GET_FILE = 'SELECT displayName ' +
                   'FROM files WHERE asset = (?) AND version = (?);';
var SQL_NEW_ASSET = 'INSERT INTO assets (name, owner, description) ' +
                    'VALUES (?, ?, ?);';
var SQL_NEW_FILE = 'INSERT INTO files (asset, version, displayName) ' +
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

router.get('/:assetName', auth.verify, function(req, res) {
  var assetPath = path.join(conf.storageDir, req.params.assetName);
  /* List individual versions from the directory */
  fs.readdir(assetPath, function(err, data) {
    if (err) {
      return res.send(err.toString());
    }
    var versions = data;
    getAsset = db.prepare(SQL_GET_ASSET_BY_NAME);
    /* Get asset metadata from the database */
    getAsset.get(req.params.assetName, function(err, data) {
      var result = {
        versions: versions,
        name: req.params.assetName,
        description: data.description
      };
      return res.send(result);
    });
  });
});

router.get('/:assetName/:versionName', auth.verify, function(req, res) {
  var params = [req.params.assetName, req.params.versionName];
  db.get(SQL_GET_FILE, params, function(err, data) {
    if (err) return res.send(err);
    var fullpath = path.join(
      conf.storageDir,
      req.params.assetName,
      req.params.versionName
    );
    res.download(fullpath, data.displayName);
  });
});

router.post('/:assetName/:versionName',
            auth.verify, auth.verifyAssetExists, function(req, res) {
  /* Store asset in [asset-data]/assetName/versionName */
  var assetPath = path.join(conf.storageDir, req.params.assetName);
  if (!fs.existsSync(assetPath)){
    fs.mkdirSync(assetPath);
  }
  /* Create fs storage callbacks */
  var storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, assetPath);
    },
    filename: function (req, file, callback) {
      var newFile = db.prepare(SQL_NEW_FILE);
      var params = [
        req.params.assetName,   // asset name
        req.params.versionName, // version
        file.originalname       // displayName
      ];
      newFile.run(params, function(err) {
        newFile.finalize();
        if (err)
          return callback(err);
        else
          return callback(null, req.params.versionName);
      });
    }
  });
  /* multer(...).single(<filename>) returns a middleware router */
  multer({storage: storage}).single('upload')(req, res, function(err) {
    if (err) {
      console.error(err);
      return res.send({error: 'There was an issue uploading the file'});
    }
    return res.send({status: 'ok'});
  });
});

router.put('/:assetName', auth.verify, function(req, res) {
  var assetPath = path.join(conf.storageDir, req.params.assetName);
  if (!fs.existsSync(assetPath)){
    fs.mkdirSync(assetPath);
  }
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
  storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, conf.storageDir);
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + '-' + Date.now());
    }
  });
  return router;
}
