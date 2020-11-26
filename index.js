const CLIENT_TOKEN = require('./config.js').CLIENT_TOKEN;
const OVERLORD_ID = require('./config.js').OVERLORD_ID;
const PREFIX = require('./config.js').PREFIX;
const CHANNEL_PREFIX = require('./config.js').CHANNEL_PREFIX;
const DEFAULT_COMMAND_PREFIX = require('./config.js').PREFIX;
const DEFAULT_CHANNEL_PREFIX = require('./config.js').CHANNEL_PREFIX;
const DEFAULT_EMBED_COLOR = "FF6600";

const SUCCESS = 100010;
const NOT_REGISTERED = 100011;
const ALREADY_REGISTERED = 100012;
const NOT_VOICE = 100013;
const FAILURE = 100014;

console.log("NODE VERSION: " + process.version);

const dbCon = require('./sqlite_lib');
dbCon.start();

const discord = require('discord.js');
const client = new discord.Client();

client.login(CLIENT_TOKEN);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(PREFIX,{type:"LISTENING"});
});

client.on('guildCreate', async guild => {
  console.log("Added to guild " + guild.name + " (" + guild.id + ")");
  embed("Welcome",DEFAULT_EMBED_COLOR,"Hello and thanks for adding me to your server! Use the command `"
       + DEFAULT_COMMAND_PREFIX + "help` for a list of commands, or visit the "
       +"[readme](https://github.com/horinezachary/dynamic-channel-bot/blob/master/README.md) for more help!",guild.systemChannel);
}

//add watched channel
client.on('message', async message => {
  console.log(message.content);
  if (message.content.startsWith(PREFIX + "register") && hasPermission(message.channel, message.author)) {
    if(message.content.match(/(?:register\s*)(all)$/)) {
      //all has been specified, add all channels in guild
        let channels = message.channel.guild.channels.cache.array();
        console.log(channels);
        let successString = "These voice channels were successfully registered: ```";
        let alreadyRegisteredString = "These voice channels were already registered: ```";
        for (c of channels) {
          var channel = await message.guild.channels.cache.get(c.id);
          if (channel.type == "voice") {
            let result = await register(channel);
            if (result.state == SUCCESS) {
              successString += result.innerContent + "\n";
            }
            else if (result.state == ALREADY_REGISTERED){
              alreadyRegisteredString += result.innerContent + "\n";
            }
          }
        }
        embed("Server Register",DEFAULT_EMBED_COLOR,"The channels in this server (`" + channel.guild.name + "`) are now registered.\n\n"
                                            + successString + " ```" + alreadyRegisteredString + " ```",message.channel);
    } else {
      var channels = message.content.match(/(?=\s)?([0-9]{18})(?=\s)?/g); //returns array of channel ids in message
      for (c of channels) {
        console.log(c);
        var c = await message.guild.channels.cache.get(c);
        if (!c) { //not channel
          if (c.type == "voice") {
            let result = await register(channel);
            console.log(result);
            embed("Register",DEFAULT_EMBED_COLOR,result.message + "```" + result.innerContent + "```",message.channel);
          } else if (channel.type == "category"){
            console.log("category");
            console.log(channel.children);
            let successString = "These voice channels in this category were successfully registered: ```";
            let alreadyRegisteredString = "These voice channels were already registered: ```";
            //check and unregister all voice channels in the category
            for (child of channel.children.array()) {
              console.log(child.id);
              if (child.type == "voice") {
                let result = await register(child);
                console.log(result);
                if (result.state == SUCCESS) {
                  successString += result.innerContent + "\n";
                }
                else if (result.state == ALREADY_REGISTERED){
                  alreadyRegisteredString += result.innerContent + "\n";
                }
              } else {
                //not a voice channel, so ignore it
              }
            }
            embed("Category Register",DEFAULT_EMBED_COLOR,"The channels in the requested category (`" + channel.name + "`) are now registered.\n\n"
                                                + successString + " ```" + alreadyRegisteredString + " ```",message.channel);
          } else {
            embed("Register",DEFAULT_EMBED_COLOR,"The requested channel (" + channel.name + ":" + channel.id + ") is not a valid voice channel or category.",messageChannel);
          }
        } else {
          //not channel
          embed("Register",DEFAULT_EMBED_COLOR,"The given id is not a valid voice channel or category.",messageChannel);
        }
      }
    }
  }
  if (message.content.startsWith(PREFIX + "help")) {
    if (hasPermission(message.channel, message.author)) {
      embed("Dynamic Channels **Help**",DEFAULT_EMBED_COLOR,"Commands:\n"
           +"`" + PREFIX + "register`: This command is used to add a channel to the dynamic channel listing.\n"
           +"    Example: `" + PREFIX + "register 123412341234123412`\n"
           +"`" + PREFIX + "unregister`: This command is used to remove a channel from the dynamic channel listing.\n"
           +"    Example: `" + PREFIX + "unregister 123412341234123412`\n"
           +"`" + PREFIX + "list`: This command will list all registered channels in the current guild.\n"
           +"`" + PREFIX + "reload`: This command will check, assess and update all currently registered voice channels in the current guild.\n"
           +"`" + PREFIX + "clean`: This command will remove channel prefixes added by the bot should they get stuck after channel unregister.\n"
           +"`" + PREFIX + "help`: This command will return this help text.\n"
           +"\n**NOTE**: channels must be input as id numbers, as voice channels do not have tags.\n"
           +"For more information, check out the [readme](https://github.com/horinezachary/dynamic-channel-bot/blob/master/README.md)",message.channel);
    } else {
      embed("Dynamic Channels **Help**", DEFAULT_EMBED_COLOR, "You must have the permission `MANAGE CHANNELS` to edit the settings for this bot.",message.channel);
    }
  }
  if (message.content.startsWith(PREFIX + "reload") && hasPermission(message.channel, message.author)) {
    let registeredChannelIDs = await dbCon.getRegistered(message.guild);
    for (dbChannel of registeredChannelIDs) {
      let channel = await message.guild.channels.cache.get(dbChannel.id);
      reload(channel);
    }
  }
  if (message.content.startsWith(PREFIX + "unregister") && hasPermission(message.channel, message.author)) {
    if(message.content.match(/(?:unregister\s*)(all)$/)) {
      //all has been specified, remove all channels from guild
      let channels = message.channel.guild.channels.cache.array();
      console.log(channels);
      let successString = "These voice channels were successfully unregistered: ```";
      let notRegisteredString = "These voice channels were already not registered: ```";
      for (c of channels) {
        var channel = await message.guild.channels.cache.get(c.id);
        if (channel.type == "voice") {
          let result = await unregister(channel);
          if (result.state == SUCCESS) {
            successString += result.innerContent + "\n";
          }
          else if (result.state == NOT_REGISTERED){
            notRegisteredString += result.innerContent + "\n";
          }
        }
      }
      embed("Server Unregister",DEFAULT_EMBED_COLOR,"The channels in this server (`" + channel.guild.name + "`) are now unregistered.\n\n"
                                          + successString + " ```" + notRegisteredString + " ```",message.channel);
    } else {
      var channels = message.content.match(/(?=\s)?([0-9]{18})(?=\s)?/g); //returns array of channel ids in message
      for (c of channels) {
        var channel = await message.guild.channels.cache.get(c);
        console.log(channel);
        if (channel.type == "voice") {
          let result = await unregister(channel);
          console.log(result);
          embed("Unregister",DEFAULT_EMBED_COLOR,result.message + "```" + result.innerContent + "```",message.channel);
        } else if (channel.type == "category"){
          console.log("category");
          console.log(channel.children);
          let successString = "These voice channels in this category were successfully unregistered: ```";
          let notRegisteredString = "These voice channels were already not registered: ```";
          //check and unregister all voice channels in the category
          for (child of channel.children.array()) {
            console.log(child.id);
            if (child.type == "voice") {
              let result = await unregister(child);
              console.log(result);
              if (result.state == SUCCESS) {
                successString += result.innerContent + "\n";
              }
              else if (result.state == NOT_REGISTERED){
                notRegisteredString += result.innerContent + "\n";
              }
            } else {
              //not a voice channel, so ignore it
            }
          }
          embed("Category Unregister",DEFAULT_EMBED_COLOR,"The channels in the requested category (`" + channel.name + "`) are now unregistered.\n\n"
                                              + successString + " ```" + notRegisteredString + " ```",message.channel);
        } else {
          embed("Unregister",DEFAULT_EMBED_COLOR,"The requested channel (" + channel.name + ":" + channel.id + ") is not a valid voice channel or category.",messageChannel);
        }
      }
    }
  }
  if (message.content.startsWith(PREFIX + "list") && hasPermission(message.channel, message.author)) {
    var registered = await dbCon.getRegistered(message.channel.guild);
    var description = "```\n"
                    + "┌────────────────┬────────────────┬────────────────────┐\n"
                    + "│ NAME           │ ORIGINAL NAME  │ CHANNEL            │\n"
                    + "├────────────────┼────────────────┼────────────────────┤\n";
                        //12345678901234 | 12345678901234 | 123456789012345678
    for (r of registered) {
      console.log(r);
      let name = r.name;
      if (name.startsWith(CHANNEL_PREFIX)) {
        name = name.substring(CHANNEL_PREFIX.length);
      }
      let offset = getOffset(14-name.length);
      let originalOffset = getOffset(14-r.originalName.length);
      console.log(name + " | " + r.originalName + " | " + r.id + ":" + r.guild + "\n");
      description += "│ " + name + offset + " │ " + r.originalName + originalOffset + " │ " + r.id + " │\n";
    }
    description += "└────────────────┴────────────────┴────────────────────┘\n```";
    embed("Registered Channels",DEFAULT_EMBED_COLOR,description,message.channel);
  }
  if (message.content.startsWith(PREFIX + "clean") && hasPermission(message.channel, message.author)) {
    let channels = message.guild.channels.cache.array();
    for (channel of channels) {
      if (await dbCon.isRegistered(channel) == false) {
        if (channel.name.startsWith(CHANNEL_PREFIX)) {
          setChannelName(channel,channel.name.substring(CHANNEL_PREFIX.length));
        }
      }
    }
    embed("Clean",DEFAULT_EMBED_COLOR,"Channels successfully cleaned.",message.channel);
  }
  if (message.content.startsWith(PREFIX + "close") && message.author.id == OVERLORD_ID) {
    dbCon.close();
    process.exit();
  }
});

client.on('presenceUpdate', async (oldPresence,newPresence) => {
  let same = true;
  let oldActivities;
  let newActivities;
  if (!oldPresence || oldPresence == null || oldPresence == []) {
    //oldPresence is null (shouldn't happen)
    //or is empty (happens with custom status)
    oldActivities = [];
  } else {oldActivities = oldPresence.activities}
  if (!newPresence || newPresence == null || newPresence == []) {
    //newPresence is null (shouldn't happen)
    //or is empty (happens with custom status)
    newActivities = [];
  } else {newActivities = newPresence.activities}
  if (oldActivities.length !== newActivities.length) {
    //different length, there has been a change
    same = false;
  } else {
    console.log("# Activities: " + oldActivities.length + "=> " + newActivities.length);
    for (i = 0; i < (Math.max(oldActivities.length,newActivities.length)); i++) {
      if (oldActivities[i] && newActivities[i]) {
        if (oldActivities[i].name == newActivities[i].name) {
          //the two are the same
        } else {
          //not the same
          same = false;
        }
      } else {
        //at least one doesn't exist
        same = false;
      }
    }
  }
  if (same == false) {
    //there has been a change in activity data
    let voice = await getVoiceState(newPresence.member);
    if (voice != false) {
      //returned voice object exists and channelID != null
      let channel = await newPresence.guild.channels.cache.get(voice.channelID);
      let registered = await dbCon.isRegistered(channel);
      console.log(registered);
      if (registered) {
        reload(channel);
      }
      //otherwise it's not a registered channel, and shouldn't be touched
    }
    console.log(voice);
  } else {
    //no change,both are the same
    console.log("No Rich Presence Change");
  }
  if (oldPresence.status != newPresence.status) {
    //change in status
    console.log("User " + newPresence.member.user.username + " went from " + oldPresence.status + " to " + newPresence.status);
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
            setChannelState(voiceChannel.id,game.userID,game.name);
            setChannelName(voiceChannel,CHANNEL_PREFIX + game.name);
          }
          //if none, set title and deactivate
          if (game == false) {
            clearChannelState(oldState.channelID);
            let voiceRegistration = await dbCon.isRegistered(voiceChannel);
            setChannelName(voiceChannel,CHANNEL_PREFIX + voiceRegistration.originalName);
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
  } else if (oldState.channelID == null || oldState.channelID != newState.channelID) {
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
          setChannelName(voiceChannel,CHANNEL_PREFIX + latestStartGame.name);
          setChannelState(newState.channelID,newState.id,latestStartGame.name);
        } else {
          console.log("no game to assign");
          //no games, don't assign
        }
      } else {
        //already assigned
        console.log("already assigned");
      }
    }
  } else {
    //different change
  }
});

async function register(channel) {
  if (channel.type == "voice") {
    let status = await dbCon.registerChannel(channel);
    let offset = getOffset(24-channel.name.length);
    if (status == true) { //success
      setChannelName(channel,CHANNEL_PREFIX + channel.name);
      return {"state":SUCCESS,
              "message":"The channel you requested was successfully registered.",
              "innerContent": offset + channel.name + " | " + channel.id};
    } else{ //failure
      return {"state":ALREADY_REGISTERED,
              "message":"The channel you requested was already registered.",
              "innerContent": offset + channel.name + " | " + channel.id};
    }
  } else {
    return {"state":NOT_VOICE,
            "message":"The requested channel is not a voice channel.",
            "innerContent": offset + channel.name + " | " + channel.id};
  }
}

async function unregister(channel) {
  if (channel.type == "voice") {
    let voiceRegistration = await dbCon.isRegistered(channel);
    let status = await dbCon.unregisterChannel(channel);
    let offset = getOffset(24-channel.name.length);
    if (status == true) { //success
      setChannelName(channel,voiceRegistration.originalName);
      return {"state":SUCCESS,
              "message":"The channel you requested was successfully unregistered.",
              "innerContent": offset + channel.name + " | " + channel.id};
    } else{ //failure
      return {"state":NOT_REGISTERED,
              "message":"The channel you requested was not registered.",
              "innerContent": offset + channel.name + " | " + channel.id};
    }
  } else {
    return {"state":NOT_VOICE,
            "message":"The requested channel is not a voice channel.",
            "innerContent": offset + channel.name + " | " + channel.id};
  }
}


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
    setChannelName(channel,CHANNEL_PREFIX + game.name);
  }
  //if none, set title and deactivate
  if (game == false) {
    clearChannelState(channel.id);
    let voiceRegistration = await dbCon.isRegistered(channel);
    setChannelName(channel,CHANNEL_PREFIX + voiceRegistration.originalName);
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
    let gameResult;
    if (memberGames.length > 1) {
      gameResult = await sortGames(memberGames);
    } else if (memberGames.length == 1){
      gameResult = memberGames;
    } else {
      //no games in channel
      return false;
    }
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
  if (member.permissions.has("MANAGE_CHANNELS") || member.id == OVERLORD_ID){
    return true;
  }
  return false;
}

async function getVoiceState(member) {
  let voiceStates = member.guild.voiceStates.cache;
  let memberVoice = await voiceStates.find(state => state.id == member.user.id);
  if (!memberVoice) {
    return false;
  }
  if (memberVoice.channelID == null) {
    return false;
  }
  return memberVoice;
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
      console.log(description);
    // Send the embed to the same channel as the message
    channel.send(embed);
}

function getOffset(n) {
  let offset = "";
  if (n < 0) {
    n = 0;
  }
  for (i = 0; i < n; i++) {
    offset += " ";
  }
  return offset;
}

function setChannelName(channel,name) {
  if(channel.name != name) {
    //not the same, update
    channel.setName(name);
  } else {
    //no update
  }
}
