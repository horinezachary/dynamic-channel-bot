const sqlite3 = require('sqlite3').verbose();
var db;
function dbInit() {
  db = new sqlite3.Database('./db/dynChannel.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the dynChannel SQlite database.');
  });
  db.run(`CREATE TABLE IF NOT EXISTS channels(channelId VARCHAR(18))`);
}

//returns data. query run as db.all
function asyncQuery(query, values) {
  return new Promise((resolve, reject) => {
    db.all(query, values, function(error, results) {
      if (error) {
        console.log(error);
        reject(error);
      }
      resolve(results);
    });
  });
}

//does not need to return data.
function asyncRun(query, values) {
  return new Promise((resolve, reject) => {
    db.run(query, values, function(error, results) {
      if (error) {
        console.log(error);
        reject(error);
      }
      resolve(results);
    });
  });
}

module.exports = {
  start: function() {
    return dbInit();
  },
  query: function(query, values) {
    return asyncQuery(query, values);
  },
  run: function(query, values) {
    return asyncRun(query, values);
  },
  close: function() {
    db.close();
  }
}
