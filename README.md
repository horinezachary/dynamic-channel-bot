## Dynamic Channel Bot

A basic Discord bot for dynamically changing channel names based on Rich Presence Data.

When users join a channel registered with the bot, the bot will change the name of the channel to match their Rich Presence data. When multiple users are in a channel, the first user takes precedence. If the leader leaves the VC, then a new leader is chosen, and the game title is reassessed.

### Add this bot to your server!
https://discord.com/oauth2/authorize?client_id=565353374329995296&scope=bot&permissions=8

### Commands

`dvc$register:` This command is used to add a channel to the dynamic channel listing. Example:
```
dvc$register 123412341234123412
```
`dvc$unregister:` This command is used to add a channel to the dynamic channel listing. Example:
```
dvc$unregister 123412341234123412
```
`dvc$list:` This command will list all registered channels in the current guild.

`dvc$help:` This command will return the help text in the channel it was called.\n"

**NOTE:** channels must be input as id numbers, as voice channels do not have tags.
