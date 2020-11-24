const sqlite3 = require('sqlite3').verbose();
var db;
function dbInit() {
  db = new sqlite3.Database('./db/dynChannel.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the dynChannel SQlite database.');
  });
  db.run(`CREATE TABLE IF NOT EXISTS guilds(guildId VARCHAR(18), commandPrefix, channelPrefix)`)
  db.run(`CREATE TABLE IF NOT EXISTS channels(channelId VARCHAR(18), guildId VARCHAR(18), originalName)`);
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

async function insertGuild(guild, channelPrefix, commandPrefix) {
  if (getGuild(guildId) == false) {
    await asyncRun(`INSERT INTO guilds(guildId, channelPrefix, commandPrefix) VALUES(${guildId},"${channelPrefix}","${commandPrefix}")`);
    return true;
  } else {
    return false;
  }
}

async function deleteGuild(guildId) {
  if (getGuild(guildId) == true) {
    await asyncRun(`DELETE FROM guilds WHERE guildId = ${guildId}`);
    return true;
  } else {
    return false;
  }
}

async function setCommandPrefix(guildId, commandPrefix) {
  if (getGuild(guildId) == true) {
    await asyncRun(`UPDATE guilds SET commandPrefix = "${commandPrefix}" WHERE guildId = ${channel.id}`);
    return true;
  } else {
    return false;
  }
}

async function setChannelPrefix(guildId, channelPrefix) {
  if (getGuild(guildId) == true) {
    await asyncRun(`UPDATE guilds SET channelPrefix = "${channelPrefix}" WHERE guildId = ${channel.id}`);
    return true;
  } else {
    return false;
  }
}

async function getGuild(guildId) {
  let rows = await asyncQuery(`SELECT guildId, channelPrefix, commandPrefix FROM guilds WHERE guildId = ${guild.id}`);
  if (rows.length >= 1) {
    return rows[0];
  } else {
    return false;
  }
}

//add channel to list of watched channels, returns true if success
async function registerChannel (channel) {
  if (await isRegistered(channel) == false) {
    console.log("CHANNEL: " + channel);
    await asyncRun(`INSERT INTO channels(channelId,guildId,originalName) VALUES(${channel.id},${channel.guild.id},"${channel.name}")`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been added to the table.`);
    return true;
  } else { //already registered
    return false;
  }
}

//remove channel from list of watched channels, returns true if success
async function unregisterChannel (channel) {
  if (await isRegistered(channel)) {
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
  let rows = await asyncQuery(`SELECT channelId as id, guildId as guild, originalName as originalName FROM channels WHERE guildId = ${guild.id}`);
  //console.log(rows);
  for (row of rows) {
    var channel = guild.channels.cache.get(row.id);
    var channelRow = {"id":row.id, "guild":row.guild, "originalName":row.originalName, "name":channel.name};
    var len = returnedChannels.push(channelRow);
    //console.log(channelRow);
  }
  return returnedChannels;
}

async function isRegistered(channel) {
  let registered = await getRegistered(channel.guild);
  for (r of registered) {
    if (r.id == channel.id) {
      return r;
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
    await asyncRun(`UPDATE dynamics SET channelId = ${channel.id}, leaderId = ${leader.id}, title = "${title}" WHERE channelId = ${channel.id}`);
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
  insertGuild: function(guildId, channelPrefix, commandPrefix) {
    return insertGuild(guildId, channelPrefix, commandPrefix);
  },
  deleteGuild: function(guildId) {
    return deleteGuild(guildId);
  },
  getGuild: function(guildId) {
    return getGuild(guildId);
  },
  setCommandPrefix: function(guildId, commandPrefix) {
    return setCommandPrefix(guildId, commandPrefix);
  },
  setChannelPrefix: function(guildId, channelPrefix) {
    return setChannelPrefix(guildId, channelPrefix);
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
