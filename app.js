/* assets

  AUTH='--header "X-API-KEY: <API-KEY>"'
  URL=???

  # Create new asset:
  curl $AUTH -X PUT $URL/assets/<assetName> -d 'desc=Optional description here'

  # Upload new version:
  curl $AUTH -X PUT $URL/assets/<assetName>/<assetVersion> --data-binary "@path/to/file"
  
  # Get information about an assets:
  curl $AUTH $URL/assets/<assetName>

  # Download an asset:
  curl $AUTH $URL/assets/<assetName>/<assetVersion>

  # Search for an asset:
  curl $AUTH $URL/assets/?search=keyword

  # Create new group:
  curl $AUTH -X PUT $URL/groups/<groupName>

  # View members of a group:
  curl $AUTH $URL/groups/<groupName>/members/

  # Add member to a group:
  curl $AUTH -X PUT $URL/groups/<groupName>/members/<username>

  # Associate group with an asset:
  curl $AUTH -X PUT $URL/assets/<assetName>/groups/<groupName>
  
*/


var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');

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

app.use('/assets', require('./routes/assets.js'))
app.use('/groups', require('./routes/groups.js'))

app.listen(process.env.serverport || 9090);
