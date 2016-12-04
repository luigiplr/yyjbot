import { filter, capitalize, truncate } from 'lodash'
import { getProfileInfo, getAppPlayers, getAppInfo, getSteamIDInfo, setToken } from './utils/steam'
import moment from 'moment'

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

  getProfileInfo(this._settings.auth.steam_token, message.parsedText).then(data => {
    const response = generateProfileResponse(data)
    if (typeof response === 'string') this.message.reply(message, response)
    else this.message.sendCustom(message.channel_or_dm_id, null, response)
  }).catch(err => this.message.reply(message, err))
}

function players(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: players <appid> - Returns the current amount of players for the game')
    return
  }

  getAppPlayers(message.parsedText).then(data => {
    this.message.reply(message, generatePlayersResponse(data))
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
  getAppInfo(input, cc).then(data => {
    const response = generateAppDetailsResponse(data, cc)
    if (typeof response === 'string') this.message.reply(message, response)
    else this.message.sendCustom(message.channel_or_dm_id, response.msg, response.attachments)
  }).catch(err => this.message.reply(message, err))
}

function steamid(message) {
  if (!message.parsedText) {
    this.message.reply(message, 'Usage: steamid <id> - ID can be any form of SteamID')
    return
  }
  getSteamIDInfo(this._settings.auth.steam_token, message.parsedText).then(resp => {
    this.message.reply(message, resp)
  }).catch(err => this.message.reply(message, err))
}

const generateProfileResponse = profile => {
  if (profile) {
    let realname = profile.realname ? `(${profile.realname})` : ''
    let status = profile.gameextrainfo ? `In-Game ${profile.gameextrainfo} (${profile.gameid})` : getPersonaState(profile.personastate)
    let out = [{
      "mrkdwn_in": ["text"],
      "author_name": profile.personaname,
      "author_icon": profile.avatar,
      "author_link": profile.profileurl,
      "text": [
        `*Profile Name:* ${profile.personaname} ${realname}`,
        `*Level:* ${profile.user_level} | *Status:* ${status}`,
        `*Joined Steam:* ${profile.timecreated ? moment(profile.timecreated * 1000).format("dddd, Do MMM YYYY") : 'Unknown'}`,
        `*Total Games:* ${profile.totalgames || "Unknown"} | *Most Played:* ${profile.mostplayed.name || "Unknown"} w/ ${formatPlaytime(profile.mostplayed.playtime_forever)}`,
        profile.bans ? profile.bans.VACBanned ? `*This user has ${profile.bans.NumberOfVACBans} VAC ban/s on record!*` : null : null,
        profile.communityvisibilitystate == 1 ? '*This is a private profile*' : null
      ].filter(Boolean).join('\n')
    }]
    return out
  } else return 'Error fetching profile info'
}

const generateAppDetailsResponse = (app, cc = 'US') => {
  if (app) {
    let out = {
      msg: `*<http://store.steampowered.com/app/${app.steam_appid}|${app.name}>* _(${app.steam_appid})_ _(${cc.toUpperCase()})_`,
      attachments: [{
        "fallback": app.name + '(' + app.steam_appid + ')',
        //"image_url": app.header_image,
        "mrkdwn_in": ["text", "pretext", "fields"],
        "color": "#14578b"
      }]
    }

    let price = getPriceForApp(app)
    let date = getDateForApp(app)

    out.attachments[0].fields = filter([{
      "title": "Cost",
      "value": price || null,
      "short": true
    }, {
      "title": app.release_date ? (app.release_date.coming_soon ? "Release Date" : "Released") : null,
      "value": date || null,
      "short": true
    }, {
      "title": "Type",
      "value": capitalize(app.type),
      "short": true
    }, {
      "title": "Genres",
      "value": app.genres ? (app.genres.slice(0, 3).map(g => g.description).sort().join(', ')) : null,
      "short": true
    }, {
      "title": "Current Players",
      "value": app.player_count ? formatNumber(app.player_count) : null,
      "short": true
    }, {
      "title": 'Developers',
      "value": app.developers ? (truncate(app.developers.join(', '), { length: 40 })) : null,
      "short": true
    }, {
      "title": "Metacritic",
      "value": (app.metacritic && app.metacritic.score) ? app.metacritic.score : null,
      "short": true
    }, {
      "title": "Demo",
      "value": app.demos ? 'Demos available' : null,
      "short": true
    }], 'value')
    return out
  } else return `Error: App: *${app.name}* _(${app.steam_appid})_ isn't a valid game`
}

const generatePlayersResponse = app => `There are currently *${formatNumber(app.player_count)}* people playing _${app.name}_ right now`

const formatNumber = number => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatCurrency = (n, currency) => n.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,") + ' ' + currency
const formatPlaytime = time => !time ? "Unknown" : time < 120 ? `${time} minutes` : `${Math.floor(time / 60)} hours`

const getPriceForApp = app => {
  if (app.is_free)
    return 'This game is Free 2 Play, yay :)'
  else if (app.price_overview && app.price_overview.discount_percent > 0)
    return (`~$${formatCurrency(app.price_overview.initial/100, app.price_overview.currency)}~ - *$${formatCurrency(app.price_overview.final/100, app.price_overview.currency)}* \n ${app.price_overview.discount_percent}% OFF!!! :eyes::scream:`)
  else if (app.price_overview)
    return (`$${formatCurrency(app.price_overview.initial/100, app.price_overview.currency)}`)
  else
    return '_Unknown_'
}

const getDateForApp = app => {
  let date = new Date(app.release_date.date)
  if (app.release_date.coming_soon && moment(date).isValid()) return `${app.release_date.date} (${moment().to(date)})`
  else return app.release_date.date
}

const getPersonaState = (state => {
  switch (state) {
    case 0:
      return 'Offline'
    case 1: //Online
    case 2: //Busy
    case 3: //Away
    case 4: //Snooze
    case 5: //Looking to trade
    case 6: //Looking to play
      return 'Online'
  }
})
