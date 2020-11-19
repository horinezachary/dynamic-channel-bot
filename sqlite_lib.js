const sqlite3 = require('sqlite3').verbose();
var db;
function dbInit() {
  db = new sqlite3.Database('./db/dynChannel.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the dynChannel SQlite database.');
  });
  db.run(`CREATE TABLE IF NOT EXISTS channels(channelId VARCHAR(18), guildId VARCHAR(18))`);
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

//add channel to list of watched channels, returns true if success
async function registerChannel (channel) {
  if (await isRegistered(channel) == false) {
    console.log("CHANNEL: " + channel);
    await asyncRun(`INSERT INTO channels(channelId,guildId) VALUES(${channel.id},${channel.guild.id})`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been added to the table.`);
    return true;
  } else { //already registered
    return false;
  }
}

//remove channel from list of watched channels, returns true if success
async function unregisterChannel (channel) {
  if (await isRegistered(channel) == true) {
    await asyncRun(`DELETE FROM channels WHERE channelId = ${channel.id}`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been removed from the table.`);
    return true;
  } else {
    //already unregistered
    return false;
  }
}

async function getRegistered(guild) {
  let returnedChannels = [];
  let rows = await asyncQuery(`SELECT channelId as id, guildId as guild FROM channels WHERE guildId = ${guild.id}`);
  //console.log(rows);
  for (row of rows) {
    var channel = guild.channels.cache.get(row.id);
    var channelRow = {"id":row.id, "guild":row.guild, "name":channel.name};
    var len = returnedChannels.push(channelRow);
    //console.log(channelRow);
  }
  return returnedChannels;
}

async function isRegistered(channel) {
  let registered = await getRegistered(channel.guild);
  console.log(registered);
  for (r of registered) {
    if (r.id == channel.id) {
      return true;
    }
  }
  return false;
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
  registerChannel: function(channel) {
    return registerChannel(channel);
  },
  unregisterChannel: function(channel) {
    return unregisterChannel(channel);
  },
  getRegistered: function(guild) {
    return getRegistered(guild);
  },
  isRegistered: function(channel) {
    return isRegistered(channel);
  },
  close: function() {
    db.close();
  }
}
