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
            setChannelState(voiceChannel,game.userID,game.name);
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
            if (game.timestamps.start == null) {
              //do nothing (if this happens to the first game in the listing it'll show up anyways)
            }
            else if (game.timestamps.start > latestStart) {
              latestStart = game.timestamps.start;
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

async function checkChannelState(channelID) {
  let channel = await client.channels.cache.get(channelID).guild.channels.cache.get(channelID);
  console.log(channel);
  if (channel.members.length > 0) {
    let memberGames = [];
    for (member of channel.members) {
      let games = await getGameActivities(member.id);
      if (games.length >= 1) {
        let latestStart = 0;
        let latestStartGame = games[0];
        for (game of games) {
          if (game.timestamps.start == null) {
            //do nothing (if first element it'll already be picked)
          }
          else if (game.timestamps.start >= latestStart) {
            latestStartGame = game;
          }
        }
        memberGames.push(latestStartGame);
      }
    }
    console.log("MEMBERGAMES");
    console.log(memberGames);
    let game = await sortGames(memberGames);
    return game;
  } else {
    return false;
  }
}

function sortGames(games) {
  let count = [];
  for (game in games) {
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
  console.log("SORTGAMES");
  console.log(count);
  console.log(largest);
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
  //console.log(channel.guild);
  let member = channel.guild.members.cache.get(author.id);
  console.log(member.permissions);
  if (member.permissions.has("MANAGE_CHANNELS")){
    return true;
  }
  //console.log(member);
  return false;
}

async function getRichPresence(userID) {
  let member = await client.users.fetch(userID);
  let presence = member.presence;
  let activities = presence.activities;
  //console.log(activities);
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
  console.log("GAME ACTIVITIES");
  console.log(games);
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
