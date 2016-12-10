import Steam from './utils/steam'

export default {
  id: 'steam',
  commands: [{
    trigger: /^(sp|steamprofile)/,
    listener: false,
    command: steamProfile,
    usage: 'sp|steamprofile <steamid/vanityid> - returns user steam profile'
  }, {
    trigger: /^(players)/,
    listener: false,
    command: players,
    usage: 'players <appid> - returns players for steam app'
  }, {
    trigger: /^(game|app)/,
    listener: false,
    command: game,
    usage: 'game <appid or game name> - returns steam game info'
  }, {
    trigger: /^(sid|steamid)/,
    listener: false,
    command: steamid,
    usage: 'steamid <steamid/vanityid> - returns steamid info'
  }]
}

function steamProfile(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: steamprofile <SteamID/64 or VanityURL ID> - Returns a users basic Steam Information')
    return
  }

  Steam(this._settings.auth.steam_token).getProfileInfo(message.parsedText).then(data => {
    let response = Steam().generateProfileResponse(data)
    if (typeof response === 'string') this.message.reply(message, response)
    else this.message.sendCustom(message.channel_or_dm_id, null, response)
  }).catch(err => this.message.reply(message, err))
}

function players(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: players <appid> - Returns the current amount of players for the game')
    return
  }

  Steam().getAppInfo(message.parsedText, null, true).then(data => {
    this.message.reply(message, Steam().generatePlayersResponse(data))
  }).catch(err => this.message.reply(message, err))
}

function game(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: game <appid or game name> [-cc us] - Returns basic game info such as price and name, optinally include the country code via -cc AU')
    return
  }
  var cc, input = message.parsedText
  if (message.parsedText.match(/-cc.../)) {
    cc = input.match(/-cc.../)[0].split(' ')[1]
    input = input.replace(input.match(/-cc.../)[0], '').trim()
  }
  Steam().getAppInfo(input, cc).then(data => {
    let response = Steam().generateAppDetailsResponse(data, cc)
    if (typeof response === 'string') this.message.reply(message, response)
    else this.message.sendCustom(message.channel_or_dm_id, response.msg, response.attachments)
  }).catch(err => this.message.reply(message, err))
}

function steamid(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: steamid <id> - ID can be any form of SteamID')
    return
  }
  Steam(this._settings.auth.steam_token).getSteamIDInfo(message.parsedText).then(resp => {
    this.message.reply(message, resp)
  }).catch(err => this.message.reply(message, err))
}
