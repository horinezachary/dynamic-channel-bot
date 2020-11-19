const CLIENT_TOKEN = require('./config.js').CLIENT_TOKEN;

const dbCon = require('./sqlite_lib');
dbCon.start();

const discord = require('discord.js');
const client = new discord.Client();

client.login(CLIENT_TOKEN);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

//add watched channel
client.on('message', async message => {
  console.log(message.content);
  if (message.content.startsWith("z$register")) {
    if (hasPermission(message.channel, message.author)) {
      var channels = message.content.match(/(?=\s)?([0-9]{18})(?=\s)?/g); //returns array of channel ids in message
      for (c of channels) {
        console.log(c);
        var taggedChannel = message.guild.channels.cache.get(c);
        if (taggedChannel.type == "voice") {
          registerChannel(taggedChannel,message.channel);
        } else {
          embed("Register","FF6600","The requested channel (" + taggedChannel.name + ":" + taggedChannel.id + ") is not a voice channel.",taggedChannel);
        }
      }
    } else {
      //no permission
    }
  }
  if (message.content.startsWith("z$unregister")) {
    if (hasPermission(message.channel, message.author)) {
      var channels = message.content.match(/(?=\s)?([0-9]{18})(?=\s)?/g); //returns array of channel ids in message
      for (c of channels) {
        console.log(c);
        var taggedChannel = message.guild.channels.cache.get(c);
        if (taggedChannel.type == "voice") {
          unregisterChannel(taggedChannel,message.channel);
        } else {
          embed("Unregister","FF6600","The requested channel (" + taggedChannel.name + ":" + taggedChannel.id + ") is not a voice channel.",taggedChannel);
        }
      }
    } else {
      //no permission
    }
  }
  if (message.content.startsWith("z$list")) {
    var registered = await getRegistered();
    var description = "```    NAME   |     CHANNEL       |      GUILD         \n";
        description +=   "----------------------------------------------------\n";
    for (r of registered) {
      let space = getOffset(10-r.name.length);
      console.log(r.name + " | " + r.id + ":" + r.guild + "\n");
      description += space + r.name + " | " + r.id + ":" + r.guild + "\n";
    }
    embed("Registered Channels","FF6600",description+"```",message.channel);
  }
  if (message.content.startsWith("z$close")) {
    dbCon.close();
    process.exit();
  }
});

//voice update
client.on('voiceStateUpdate', async (oldState,newState) => {
  if (newState.channelID == null) {
    //user left the channel
    console.log("user " + oldState.id + " left channel " + oldState.channelID);
    if (isRegistered(client.channels.cache.get(oldState.channelID))) {
      let oldS = oldState;
      delete oldS.guild;
      console.log(oldS);
    }
  } else if (oldState.channelID == null) {
    //user joined the channel
    console.log("user " + newState.id + " joined channel " + newState.channelID);
    if (isRegistered(newState.channel)) {
      let newS = newState;
      delete newS.guild;
      console.log(newS);
    }
  }
});

function hasPermission(channel, author) {
  //console.log(channel.guild);
  let member = channel.guild.members.cache.get(author.id);
  console.log(member.permissions);
  if (member.permissions.has("MANAGE_CHANNELS")){
    return true;
  }
  //console.log(member);
  return false;
}

async function registerChannel (channel, requestChannel) {
  if (await isRegistered(channel) == false) {
    console.log("CHANNEL: " + channel);
    await dbCon.run(`INSERT INTO channels(channelId) VALUES(${channel.id})`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been added to the table.`);
    embed("Register","FF6600","The channel you requested was successfully registered.\n"
         +"```" + channel.name + " | " + channel.id + ":" + channel.guild + "```",requestChannel);
  } else {
    //already registered
    embed("Register","FF6600","The channel you requested was already registered."
         +"```" + channel.name + " | " + channel.id + ":" + channel.guild + "```",requestChannel);
  }
}

async function unregisterChannel (channel,requestChannel) {
  if (await isRegistered(channel) == true) {
    await dbCon.run(`DELETE FROM channels WHERE channelId = ${channel.id}`);
    // get the last insert id
    console.log(`The channel ${channel.id} has been removed from the table.`);
    embed("Unegister","FF6600","The channel you requested was successfully unregistered.\n"
         +"```" + channel.name + " | " + channel.id + ":" + channel.guild + "```",requestChannel);
  } else {
    //already unregistered
    embed("Unregister","FF6600","The channel you requested was not registered."
         +"```" + channel.name + " | " + channel.id + ":" + channel.guild + "```",requestChannel);
  }
}

async function getRegistered() {
  let returnedChannels = [];
  let rows = await dbCon.query(`SELECT channelId as id FROM channels`);
  //console.log(rows);
  for (row of rows) {
    var channel = client.channels.cache.get(row.id);
    var channelRow = {"id":row.id, "guild":channel.guild.id, "name":channel.name};
    var len = returnedChannels.push(channelRow);
    //console.log(channelRow);
  }
  return returnedChannels;
}

async function isRegistered(channel) {
  let registered = await getRegistered();
  console.log(registered);
  for (r of registered) {
    if (r.id == channel.id) {
      return true;
    }
  }
  return false;
}

function embed(title,color,description,channel) {
  const embed = new discord.MessageEmbed()
      // Set the title of the field
      .setTitle(title)
      // Set the color of the embed
      .setColor(color)
      // Set the main content of the embed
      .setDescription(description);
    // Send the embed to the same channel as the message
    channel.send(embed);
}

function getOffset(n) {
  let offset = "";
  for (i = 0; i < n; i++) {
    offset += " ";
  }
  return offset;
}
