import { get, isEmpty, filter, capitalize, truncate } from 'lodash'
import request from 'request'
import SteamID from 'steamid'
import moment from 'moment'

const filters = ['basic', 'price_overview', 'release_date', 'metacritic', 'developers', 'genres', 'demos'].join(',')
const endpoints = {
  profile: `http://steamcommunity.com/id/%q%/?xml=1`, // Unused
  profileSummary: `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=%token%&steamids=%q%`,
  miniProfile: `http://steamcommunity.com/miniprofile/%q%`, // Unused
  gameSummary: `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=%token%&steamid=%q%&include_played_free_games=1`,
  appDetailsBasic: `http://store.steampowered.com/api/appdetails?appids=%q%&filters=basic`,
  appDetails: `http://store.steampowered.com/api/appdetails?appids=%q%&filters=${filters}&cc=%cc%`,
  packageDetails: `http://store.steampowered.com/api/packagedetails/?packageids=%q%&cc=us`, // Unused
  searchApps: `http://steamcommunity.com/actions/SearchApps/%q%`,
  numPlayers: `http://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=%q%`,
  userBans: `http://api.steampowered.com/ISteamUser/GetPlayerBans/v0001/?key=%token%&steamids=%q%`,
  appList: `http://api.steampowered.com/ISteamApps/GetAppList/v0002/`, // Unused
  userLevel: `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=%token%&steamid=%q%`,
  resolveVanity: `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=%token%&vanityurl=%q%`
}

const getUrl = (type, token, param, cc) => {
  let out = endpoints[type].replace('%q%', param).replace('%cc%', cc).replace('%token', token)
  return (cc ? out.replace('%cc%', cc) : out)
}

const getIDFromProfile = (token, id) => {
  return new Promise((resolve, reject) => request(getUrl('resolveVanity', token, id), { json: true }, (err, resp, { response }) => {
    if (!err && response)
      if (response.success == 1) return resolve(response.steamid)
      else return reject("Invalid Vanity ID")
    else return reject('Error retrieving profile ID')
  }))
}

const formatProfileID = (token, id) => {
  return new Promise((resolve, reject) => {
    if (id.match(/^[0-9]+$/) || id.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/) || id.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/)) {
      let sID = new SteamID(id)
      if (sID.isValid()) return resolve(sID.getSteamID64())
      else return reject('Invalid ID')
    } else getIDFromProfile(token, id).then(resolve).catch(reject)
  })
}

const getUserLevel = (token, id) => {
  return new Promise(resolve => request(getUrl('userLevel', token, id), { json: true }, (err, resp, { response }) => {
    if (!err && response) return resolve(response.player_level)
    else return resolve(0)
  }))
}

const getUserBans = (token, id) => {
  return new Promise(resolve => request(getUrl('userBans', token, id), { json: true }, (err, resp, { players }) => {
    if (!err && players[0]) return resolve(players[0])
    else return resolve(0)
  }))
}

const getUserGames = (token, id) => {
  return new Promise((resolve, reject) => request(getUrl('gameSummary', token, id), { json: true }, (err, resp, body) => {
    if (!err && body && body.response) return resolve(body.response)
    else return reject('Error retrieving user games')
  }))
}

const getAppDetails = (appid, cc, basic) => {
  return new Promise((resolve, reject) => request(getUrl(basic ? 'appDetailsBasic' : 'appDetails', null, appid, cc), { json: true }, (err, resp, body) => {
    if (!err && body)
      if (get(body, `[${appid}].success`)) return resolve(body[appid].data)
      else return reject(`Couldn't fetch app details for that AppID, invalid? ${appid}`)
    else return reject('Error retrieving game details')
  }))
}

const searchForApp = (query, isAppID) => {
  return new Promise((resolve, reject) => {
    if (isAppID) return resolve(query)
    request(getUrl('searchApps', null, query), { json: true }, (err, resp, apps) => {
      if (!err && apps.length) return resolve(apps[0].appid)
      else return reject("Couldn't find an app with that name")
    })
  })
}

const getPlayersForApp = appid => {
  return new Promise((resolve, reject) => request(getUrl('numPlayers', null, appid), { json: true }, (err, resp, { response }) => {
    if (!err && response)
      if (typeof response.player_count != 'undefined') return resolve(response)
      else return reject('Unable to view player counts for this app')
    else return reject('Error retrieving player counts')
  }))
}

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

export default function Steam(token) {
  return {
    getProfileInfo: function(id) {
      return new Promise((resolve, reject) => formatProfileID(token, id).then(newID => request(getUrl('profileSummary', token, newID), { json: true }, (err, resp, body) => {
        if (!err && body) {
          let profile = body.response.players[0];
          Promise.all([getUserLevel(token, newID), getUserBans(token, newID), getUserGames(token, newID)]).then(([level, bans, games]) => {
            profile.user_level = level
            profile.bans = bans
            profile.totalgames = games.game_count
            if (isEmpty(games)) {
              profile.mostplayed = {}
              return resolve(profile)
            }
            let sortedGames = games.games.sort((a, b) => b.playtime_forever - a.playtime_forever)
            profile.mostplayed = sortedGames[0]
            getAppDetails(sortedGames[0].appid, false, true).then(game => {
              if (game) {
                profile.mostplayed.name = game.name;
                return resolve(profile)
              }
            }).catch(reject)
          }).catch(reject)
        } else return reject('Error retrieving profile info')
      })).catch(reject))
    },
    getAppInfo: function(appid, cc = 'US', playersOnly) {
      return new Promise((resolve, reject) => {
        var isAppID = appid.match(/^\d+$/)
        searchForApp(appid, isAppID).then(id => {
          Promise.all([getAppDetails(id, cc), getPlayersForApp(id)]).then(([app, players]) => {
            if (playersOnly) {
              players.name = app.name
              return resolve(players)
            }
            app.player_count = players.player_count
            return resolve(app)
          }).catch(reject)
        }).catch(reject)
      })
    },
    // Credit to DoctorMcKays original code this is based off
    // https://github.com/DoctorMcKay/steam-irc-bot/blob/master/irc-commands/steamid.js
    getSteamIDInfo: function(id) {
      return new Promise((resolve, reject) => formatProfileID(token, id).then(newID => {
        let sid = new SteamID(newID)
        let i, details = []
        for (i in SteamID.Universe) {
          if (sid.universe == SteamID.Universe[i]) {
            details.push(`*Universe:* ${capitalize(i.toLowerCase())} (${sid.universe})`)
            break
          }
        }
        for (i in SteamID.Type) {
          if (sid.type == SteamID.Type[i]) {
            details.push(`*Type:* ${i.split('_').map(j => capitalize(j.toLowerCase())).join(' ')} (${sid.type})`)
            break
          }
        }
        for (i in SteamID.Instance) {
          if (sid.instance == SteamID.Instance[i]) {
            details.push(`*Instance:* ${capitalize(i.toLowerCase())} (${sid.instance})`)
            break
          }
        }
        let msg = `${sid.getSteam3RenderedID()} ${sid.type == SteamID.Type.INDIVIDUAL ? '/' + sid.getSteam2RenderedID() : ''} / ${sid.getSteamID64()} \n *Valid:* ${sid.isValid() ? 'True' : 'False'}, ${details.join(', ')}, *AccountID:* ${sid.accountid}`;
        return resolve(msg)
      }).catch(reject))
    },
    generateProfileResponse: function(profile) {
      if (profile) {
        let realname = profile.realname ? `(${profile.realname})` : ''
        let status = profile.gameextrainfo ? `In-Game ${profile.gameextrainfo} (${profile.gameid})` : getPersonaState(profile.personastate)
        let out = [{
          mrkdwn_in: ['text'],
          author_name: profile.personaname,
          author_icon: profile.avatar,
          author_link: profile.profileurl,
          text: [
            `*Profile Name:* ${profile.personaname} ${realname}`,
            `*Level:* ${profile.user_level} | *Status:* ${status}`,
            `*Joined Steam:* ${profile.timecreated ? moment(profile.timecreated * 1000).format('dddd, Do MMM YYYY') : 'Unknown'}`,
            `*Total Games:* ${profile.totalgames || 'Unknown'} | *Most Played:* ${profile.mostplayed.name || 'Unknown'} w/ ${formatPlaytime(profile.mostplayed.playtime_forever)}`,
            profile.bans ? profile.bans.VACBanned ? `*This user has ${profile.bans.NumberOfVACBans} VAC ban/s on record!*` : null : null,
            profile.communityvisibilitystate == 1 ? '*This is a private profile*' : null
          ].filter(Boolean).join('\n')
        }]
        out[0].fallback = out[0].text.split('\n').join(' | ').replace(/\*/g, '')
        return out
      } else return 'Error fetching profile info'
    },
    generateAppDetailsResponse: function(app, cc = 'US') {
      if (app) {
        let price = getPriceForApp(app)
        let date = getDateForApp(app)

        let out = {
          attachments: [{
            fallback: `${app.name} (${app.steam_appid}) | Cost: ${price} | Current Players: ${app.player_count ? formatNumber(app.player_count) : null}`,
            image_url: app.header_image,
            mrkdwn_in: ["text", "pretext", "fields"],
            pretext: `*<http://store.steampowered.com/app/${app.steam_appid}|${app.name}>* _(${app.steam_appid})_ _(${cc.toUpperCase()})_`,
            color: "#14578b"
          }]
        }

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
          "value": app.developers ? (truncate(app.developers.join(', '), { length: 45 })) : null,
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
    },
    generatePlayersResponse: function(app) {
      return `There are currently *${formatNumber(app.player_count)}* people playing _${app.name}_ right now`
    }
  }
}
