var sqlite = require('sqlite3');
var path = require('path');
var util = require('util');
var dbtools = require('../lib/dbtools.js');
var db = dbtools.db;

/* Initialized in init(...) */
var conf = null;

var SQL_GET_SESSION = 'SELECT * FROM keys WHERE key = (?);';
var SQL_DELETE_SESSION = 'DELETE FROM keys WHERE key = (?);';
var SQL_GET_ASSET = 'SELECT name FROM assets WHERE name = (?);';

exports.canWrite = function(req, res, next) {
  var AUTH_ERROR = 'You do not have write access to this asset';
  var SQL_CHECK_IN_GROUP =
    'select COUNT(*) from groupAssets where groupName in ' +
    ' (select groupName from groupUsers where userName = $user) ' +
    ' and assetName = $asset ' +
    ' and groupWrite != 0';
  var SQL_CHECK_OWNER =
    'select COUNT(*) from assets where owner = $user and name = $asset';
  var SQL_CHECK_GLOBAL_WRITE =
    'select COUNT(*) from assets where name = $asset and allWrite != 0';
  var SQL_CAN_WRITE = util.format(
    'select (%s) + (%s) + (%s) as writeAccess',
    SQL_CHECK_IN_GROUP, SQL_CHECK_OWNER, SQL_CHECK_GLOBAL_WRITE
  );
  var params = {$user:req.authenticatedUser, $asset:req.params.assetName};
  /* SQL_CAN_WRITE counts the number of group writable memberships the
     user has plus 1 if the user owns the asset. If this number is greater
     than 0, the user has write access to the asset */
  db().get(SQL_CAN_WRITE, params, function(err, data) {
    if (err) return res.status(500).send({error:err.toString()});
    if (data.writeAccess > 0)
      return next();
    return res.status(403).send({error:AUTH_ERROR});
  });
};

exports.canRead = function(req, res, next) {
  var AUTH_ERROR = 'You do not have read access to this asset';
  var SQL_CHECK_IN_GROUP =
    'select COUNT(*) from groupAssets where groupName in ' +
    ' (select groupName from groupUsers where userName = $user) ' +
    ' and assetName = $asset ' +
    ' and groupRead != 0';
  var SQL_CHECK_OWNER =
    'select COUNT(*) from assets where owner = $user and name = $asset';
  var SQL_CHECK_GLOBAL_READ =
    'select COUNT(*) from assets where name = $asset and allRead != 0';
  var SQL_CAN_READ = util.format(
    'select (%s) + (%s) + (%s) as readAccess',
    SQL_CHECK_IN_GROUP, SQL_CHECK_OWNER, SQL_CHECK_GLOBAL_READ
  );
  var params = {$user:req.authenticatedUser, $asset:req.params.assetName};
  /* SQL_CAN_READ counts the number of group readable memberships the
     user has plus 1 if the user owns the asset. If this number is greater
     than 0, the user has read access to the asset */
  db().get(SQL_CAN_READ, params, function (err, data) {
    if (err) return res.status(500).send({error:err.toString()});
    if (data.readAccess > 0)
      return next();
    return res.status(403).send({error:AUTH_ERROR});
  });
};

exports.disableModification = function(req, res, next) {
  var urlBase = req.originalUrl.split('/')[1];
  /* restrict POST, PUT, DELTE on non 'synchronize' targets */
  if (req.method=='GET' || req.method=='HEAD' || urlBase=='synchronize') {
      return next();
  }
  var rootName = process.env.CUMULUS_SOURCE;
  res.status(500).send({
    error:'This is a leaf node instance. Please push to ' + rootName
  });
};

exports.isGroupAdmin = function(req, res, next) {
  var AUTH_ERROR = 'You are not an admin for this group';
  var SQL_IS_ADMIN =
    'select 1 from groupUsers where groupName = $group ' +
    '  and userName = $user and isAdmin != 0';
  var params = {$user:req.authenticatedUser, $group:req.params.groupName};
  db().get(SQL_IS_ADMIN, params, function(err, isAdmin) {
    if (err) return res.status(500).send({error:err.toString()});
    if (!isAdmin)
      return res.status(403).send({error:AUTH_ERROR});
    next();
  });
};

exports.sessionStatus = function(req, callback) {
  /* Check for api key information in the header */
  if (!req.headers || !req.headers['x-api-key']) {
    if (callback) return callback({error: 'X-API-KEY header data missing'});
  }
  getSession = db().prepare(SQL_GET_SESSION);
  getSession.get(req.headers['x-api-key'], function(err, keyObj) {
    getSession.finalize();
    if (err) {
      /* If the query does not complete successfully */
      console.error(err);
      if (callback) return callback({error: 'Auth key database error'});
    }
    if (!keyObj) {
      /* If no results are fetched from the database */
      if (callback) return callback({error: 'Invalid session'});
    }
    if (keyObj.expire && keyObj.expire < Date.now()) {
      /* If session is expired, delete it. If there is no expiration
         time, default to "valid" */
      deleteSession = db().prepare(SQL_DELETE_SESSION);
      deleteSession.run(req.headers['x-api-key'], function(err, data) {
        if (err) console.error(err);
      });
      deleteSession.finalize();
      if (callback) return callback({error: 'Session expired'});
    }
    req.authenticatedUser = keyObj.owner;
    if (callback) return callback({user: keyObj.owner});
  });
};

exports.verify = function(req, res, next) {
  /* Middleware adapter for sessionStatus(...)
     calls next() if sessionStatus does not contain and error,
     otherwise sends the error to the user */
  exports.sessionStatus(req, function(stat) {
    if (stat.error) {
      res.status(500).send(stat);
      res.end();
    } else {
      next();
    }
  });
};

exports.userInGroup = function(groupName, userName, callback) {
  if (!callback) callback = function(err) {};
  SQL_GROUP_HAS_MEMBER =
    'SELECT * FROM groupUsers WHERE groupName = ? AND userName = ?;';
  var params = [groupName, userName];
  db().get(SQL_GROUP_HAS_MEMBER, params, function(err, data) {
    /* If there is a database error */
    if (err)
      return callback(err.toString());
    /* If groupName,userName does not exist in the table */
    if (!data)
      return callback('You are not a member of this group');
    callback();
  });
};

exports.groupVerify = function(req, res, next) {
  /* Check that req.authenticatedUser is a member of req.params.groupName and
     has write access */
  exports.userInGroup(req.params.groupName, req.authenticatedUser, function(err) {
    if (err) return res.status(500).send({error:err});
    next();
  });
};

exports.verifyAssetExists = function(req, res, next) {
  getAsset = db().prepare(SQL_GET_ASSET);
  getAsset.get(req.params.assetName, function(err, data) {
    getAsset.finalize();
    if (err || !data) {
      return res.status(404).send({error: 'Asset does not exist'});
    }
    next();
  });
};

exports.init = function(configuration) {
  conf = configuration;
  return exports;
};
