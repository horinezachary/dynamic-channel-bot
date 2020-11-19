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
          let status = await dbCon.registerChannel(taggedChannel);
          if (status == true) { //success
            embed("Register","FF6600","The channel you requested was successfully registered.\n"
                 +"```" + taggedChannel.name + " | " + taggedChannel.id + ":" + taggedChannel.guild + "```",message.channel);
          } else{ //failure
            embed("Register","FF6600","The channel you requested was already registered."
                 +"```" + taggedChannel.name + " | " + taggedChannel.id + ":" + taggedChannel.guild + "```",message.channel);
          }
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
          let status = await dbCon.unregisterChannel(taggedChannel);
          if (status == true) { //success
            embed("Unregister","FF6600","The channel you requested was successfully unregistered.\n"
                 +"```" + taggedChannel.name + " | " + taggedChannel.id + ":" + taggedChannel.guild + "```",message.channel);
          } else{ //failure
            embed("Unregister","FF6600","The channel you requested was not registered."
                 +"```" + taggedChannel.name + " | " + taggedChannel.id + ":" + taggedChannel.guild + "```",message.channel);
          }
        } else {
          embed("Unregister","FF6600","The requested channel (" + taggedChannel.name + ":" + taggedChannel.id + ") is not a voice channel.",taggedChannel);
        }
      }
    } else {
      //no permission
    }
  }
  if (message.content.startsWith("z$list")) {
    var registered = await dbCon.getRegistered(message.channel.guild);
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
    if (dbCon.isRegistered(client.channels.cache.get(oldState.channelID))) {
      let oldS = oldState;
      delete oldS.guild;
      console.log(oldS);
    }
  } else if (oldState.channelID == null) {
    //user joined the channel
    console.log("user " + newState.id + " joined channel " + newState.channelID);
    if (dbCon.isRegistered(client.channels.cache.get(newState.channelID))) {
      let newS = newState;
      delete newS.guild;
      console.log(newS);
      //check for rich presence
      let rp = getRichPresence(newState.id,newState.channelID);
    }
  } else {
    //different change
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

async function getRichPresence(userID,channelID) {
  let channel = client.channels.cache.get(channelID);
  let member = channel.guild.members.cache.get(userID);
  let user = member.user;
  let presence = user.presence;
  let activities = user.presence.activities;
  console.log(presence);
  console.log(activities);
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
