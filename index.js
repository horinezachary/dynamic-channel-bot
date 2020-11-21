const CLIENT_TOKEN = require('./config.js').CLIENT_TOKEN;
const OVERLOARD_ID = require('./config.js').OVERLOARD_ID;
const PREFIX = "dvc$";
const dbCon = require('./sqlite_lib');
dbCon.start();

const discord = require('discord.js');
const client = new discord.Client();

client.login(CLIENT_TOKEN);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(PREFIX,{type:"LISTENING"});
});

//add watched channel
client.on('message', async message => {
  console.log(message.content);
  if (message.content.startsWith(PREFIX + "register")) {
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
          embed("Register","FF6600","The requested channel (" + taggedChannel.name + ":" + taggedChannel.id + ") is not a voice channel.",message.channel);
        }
      }
    } else {
      //no permission
    }
  }
  if (message.content.startsWith(PREFIX + "help") && hasPermission(message.channel, message.author)) {
    embed("Dynamic Channels **Help**","FF6600","Commands:\n`"
         +"`dvc$register`: This command is used to add a channel to the dynamic channel listing.\n"
         +"    Example: `dvc$register 123412341234123412`\n"
         +"`dvc$unregister`: This command is used to add a channel to the dynamic channel listing.\n"
         +"    Example: `dvc$unregister 123412341234123412`\n"
         +"`dvc$list`: This command will list all registered channels in the current guild.\n"
         +"`dvc$help`: This command will return this help text.\n"
         +"\n**NOTE**: channels must be input as id numbers, as voice channels do not have tags.",message.channel)
  }
  if (message.content.startsWith(PREFIX + "reload") && hasPermission(message.channel, message.author)) {
    let registeredChannelIDs = await dbCon.getRegistered(message.guild);
    for (dbChannel of registeredChannelIDs) {
      let channel = await message.guild.channels.cache.get(dbChannel.id);
      reload(channel);
    }
  }
  if (message.content.startsWith(PREFIX + "unregister")) {
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
          embed("Unregister","FF6600","The requested channel (" + taggedChannel.name + ":" + taggedChannel.id + ") is not a voice channel.",message.channel);
        }
      }
    } else {
      //no permission
    }
  }
  if (message.content.startsWith(PREFIX + "list") && hasPermission(message.channel, message.author)) {
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
  if (message.content.startsWith(PREFIX + "close") && message.author.id == OVERLOARD_ID) {
    dbCon.close();
    process.exit();
  }
});

client.on('presenceUpdate', async (oldPresence,newPresence) => {

});


//voice update
client.on('voiceStateUpdate', async (oldState,newState) => {
  if (newState.channelID == null) {
    //user left the channel
    console.log("user " + oldState.id + " left channel " + oldState.channelID);
    if (await dbCon.isRegistered(client.channels.cache.get(oldState.channelID))) {
      let voiceChannel = client.channels.cache.get(oldState.channelID).guild.channels.cache.get(oldState.channelID);
      let channelState = await getChannelState(oldState.channelID);
      console.log("CHANNEL STATE: ");
      console.log(channelState);
      if (channelState) {
        if (channelState[0].leaderId == oldState.id) {
          //channel is still assigned and the leaving member is the leader
          console.log("leader left");
          //check for other presences in the channel
          //gets list of members in the channel, finds most popular game in channel
          let game = await checkChannelState(oldState.channelID);
          console.log(game);
          if (game != false) {
            console.log("Set " + voiceChannel.name + " to " + game.name);
            setChannelState(voiceChannel.id,game.userID,game.name);
            voiceChannel.setName(game.name);
          }
          //if none, set title and deactivate
          if (game == false) {
            clearChannelState(oldState.channelID);
            voiceChannel.setName("Dynamic VC");
          }
        } else {
          console.log("Not Leader");
          //do nothing, leader hasn't left.
        }
      } else {
        console.log("Not Assigned");
        //do nothing. the channel isn't assigned.
      }
    }
  } else if (oldState.channelID == null) {
    //user joined the channel
    console.log("user " + newState.id + " joined channel " + newState.channelID);
    if (await dbCon.isRegistered(client.channels.cache.get(newState.channelID))) {
      let voiceChannel = client.channels.cache.get(newState.channelID).guild.channels.cache.get(newState.channelID);
      //check for rich presence
      let games = await getGameActivities(newState.id);
      let channelState = await getChannelState(newState.channelID);
      console.log("CHANNEL STATE: "+ channelState);
      if (channelState == false) {
        console.log("not assigned");
        //channel is not assigned
        if (games.length >= 1) { //get the most recently started game
          console.log("NUM GAMES: " + games.length);
          let latestStart = 0;
          let latestStartGame = games[0];
          for (game of games) {
            if (game.createdTimestamp == null) {
              //do nothing (if this happens to the first game in the listing it'll show up anyways)
            }
            else if (game.createdTimestamp > latestStart) {
              latestStart = game.createdTimestamp;
              latestStartGame = game;
            }
          }
          console.log(latestStartGame.name);
          console.log("Set " + voiceChannel.name + " to " + latestStartGame.name);
          let result = voiceChannel.setName(latestStartGame.name);
          console.log(result);
          setChannelState(newState.channelID,newState.id,latestStartGame.name);
        } else {
          console.log("no game to assign");
          //no games, don't assign
        }
      } else {
        console.log("already assigned");
      }
    }
  } else {
    //different change
  }
});

async function getChannelState(channelID) {
  let channel = await client.channels.cache.get(channelID);
  let state = await dbCon.getDynamic(channel);
  let assigned = await dbCon.isDynamicRegistered(channel);
  if (state == false || assigned == false) {
    return false;
  }
  return state;
}

async function reload(channel) {
  let game = await checkChannelState(channel.id);
  console.log(game);
  if (game != false) {
    console.log(channel.id);
    console.log("Set " + channel.name + " to " + game.name);
    setChannelState(channel.id,game.userID,game.name);
    channel.setName(game.name);
  }
  //if none, set title and deactivate
  if (game == false) {
    clearChannelState(channel.id);
    channel.setName("Dynamic VC");
  }
}


async function checkChannelState(channelID) {
  let channel = await client.channels.cache.get(channelID).guild.channels.cache.get(channelID).fetch();
  if (channel.members.size >= 1) {
    let memberGames = [];
    for (member of channel.members.array()) {
      let games = await getGameActivities(member.id);
      console.log("RETURNED GAME ACTIVITIES");
      console.log(games);
      if (games.length >= 1) {
        let latestStart = 0;
        let latestStartGame = games[0];
        for (game of games) {
          if (game.createdTimestamp == null) {
            //this should never hppen....
            //do nothing (if first element it'll already be picked)
          }
          else if (game.createdTimestamp >= latestStart) {
            latestStartGame = game;
          }
          console.log(game);
          memberGames.push(game);
        }
      }
    }
    let gameResult = await sortGames(memberGames);
    console.log(gameResult);
    return gameResult;
  } else {
    console.log("no members in this channel");
    return false;
  }
}

async function sortGames(games) {
  let count = [];
  for (game of games) {
    let index = 999;
    for (c in count) {
      if (game.name == count[c].name) {
        index = c;
      }
    }
    if (index == 999) {
      //no match
      count.push({name: game.name, userID: game.user, count: 1});
    } else {
      //add one to the count
      count[index].count = count[index].count + 1;
    }
  }
  //select the one with the highest count
  let largest = count[0];
  for (result of count) {
    if (result.count > largest.count) {
      largest = result;
    }
  }
  return largest;
}

async function setChannelState(channelID,leaderID,title) {
  let channel = await client.channels.cache.get(channelID).guild.channels.cache.get(channelID);
  let leader = await channel.guild.members.cache.get(leaderID);
  await dbCon.registerDynamic(channel,leader,title);
}

async function clearChannelState(channelID) {
  let channel = await client.channels.cache.get(channelID).guild.channels.cache.get(channelID);
  await dbCon.unregisterDynamic(channel);
}



function hasPermission(channel, author) {
  let member = channel.guild.members.cache.get(author.id);
  console.log(member.permissions);
  if (member.permissions.has("MANAGE_CHANNELS") || member.id == OVERLOARD_ID){
    return true;
  }
  return false;
}

async function getRichPresence(userID) {
  let member = await client.users.fetch(userID);
  let presence = member.presence;
  let activities = presence.activities;
  return activities;
}

async function getGameActivities(userID) {
  let activities = await getRichPresence(userID);
  let games = [];
  for (activity of activities) {
    if (activity.type == "PLAYING") {
      activity.user = userID;
      games.push(activity);
    }
  }
  return games;
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
