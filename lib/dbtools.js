var sqlite = require('sqlite3');
var fs = require('fs');

module.exports.create_tables = function(dbfile, callback) {
  /* Create database if it does not already exist */
  fs.readFile('./misc/database.sql', 'utf8', function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    statements = data.split(';');
    var db = new sqlite.Database(dbfile);
    /* for each CREATE TABLE statement in misc/database.sql */
    for (var index in statements) {
      statement = statements[index];
      /* skip if statement is whitespace (SQLITE errno 21) */
      if (!statement.trim()) continue;
      db.run(statement, function(err, data) {
        if (err) {
          console.error(err);
        }
      });
    }
    db.close();
  });
  if (callback) callback();
};
