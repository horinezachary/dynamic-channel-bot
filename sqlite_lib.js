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
  db.run(`CREATE TABLE IF NOT EXISTS dynamics(channelId VARCHAR(18), leaderId VARCHAR(18), title)`);
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

async function getDynamic(channel) {
  let rows = await asyncQuery(`SELECT channelId, leaderId, title FROM dynamics WHERE channelId = ${channel.id}`);
  console.log(rows);
  if (rows.length >= 1) {
    return rows;
  } else {
    return false;
  }
}

async function isDynamicRegistered(channel) {
  let rows = await asyncQuery(`SELECT channelId as id FROM dynamics WHERE channelId = ${channel.id}`);
  console.log(rows);
  if (rows.length >= 1) {
    return true;
  } else {
    return false;
  }
}

async function registerDynamic (channel,leader,title) {
  if (await isDynamicRegistered(channel) == false) {
    console.log("CHANNEL: " + channel);
    await asyncRun(`INSERT INTO dynamics(channelId,leaderId,title) VALUES(${channel.id},${leader.id},"${title}")`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been added to the table.`);
    return true;
  } else { //already registered, update instead
    await asyncRun(`UPDATE dynamics SET channelId = ${channel.id}, leaderId = ${leader.id}, title = "${title}" WHERE channelId = ${channel.id})`);
    return true;
  }
}

//remove channel from list of watched channels, returns true if success
async function unregisterDynamic (channel) {
  if (await isDynamicRegistered(channel) == true) {
    await asyncRun(`DELETE FROM dynamics WHERE channelId = ${channel.id}`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been removed from the table.`);
    return true;
  } else {
    //already unregistered
    return false;
  }
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
  getDynamic: function(channel) {
    return getDynamic(channel);
  },
  isDynamicRegistered: function(channel) {
    return isDynamicRegistered(channel);
  },
  registerDynamic: function(channel,leader,title) {
    return registerDynamic (channel,leader,title);
  },
  unregisterDynamic: function(channel) {
    return unregisterDynamic (channel);
  },
  close: function() {
    db.close();
  }
}
