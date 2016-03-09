var fs = require('fs');
var path = require('path');

module.exports.format_directory = function(targetDir, dbFileName) {
  if (!fs.existsSync(targetDir)){
    /* this should block until it is complete */
    fs.mkdirSync(targetDir);
    console.log('Created', targetDir);
  }
  var dbfile = path.join(targetDir, dbFileName);
  if (!fs.existsSync(dbfile)) {
    /* create file */
    fs.closeSync(fs.openSync(dbfile, 'w'));
    console.log('Created', dbfile);
  }
};
