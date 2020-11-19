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
          registerChannel(taggedChannel);
        }
      }
    }
  }
  if (message.content.startsWith("z$list")) {
    var registered = await getRegistered();
    var description = "```";
    for (r of registered) {
      console.log(r.name + " | " + r.id + ":" + r.guild + "\n");
      description += r.name + " | " + r.id + ":" + r.guild + "\n";
    }
    embed("Registered Channels","FEFEFE",description+"```",message.channel);
  }
  if (message.content.startsWith("z$close")) {
    dbCon.close();
    process.exit();
  }
});

client.on('voiceStateUpdate', async (oldState,newState) => {
  if (isRegistered(newState.channel)) {
    console.log(newState);
  }
});

function hasPermission(channel, author) {
  //console.log(channel.guild);
  return true;
}

async function registerChannel (channel) {
    await dbCon.run(`INSERT INTO channels(channelId) VALUES(${channel.id})`);
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
}

async function getRegistered() {
  let returnedChannels = [];
  let rows = await dbCon.query(`SELECT channelId as id FROM channels`);
  console.log(rows);
  for (row of rows) {
    var channel = client.channels.cache.get(row.id);
    var channelRow = {"id":row.id, "guild":channel.guild.id, "name":channel.name};
    var len = returnedChannels.push(channelRow);
    console.log(channelRow);
  }
  return returnedChannels;
}

async function isRegistered(channel) {
  let registered = await getRegistered();
  if (registered.includes(channel.id)) {
    return true;
  } else {
    return false;
  }
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
