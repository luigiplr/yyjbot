import { forEach, pick } from 'lodash'
import Discord from 'discord.js'
import { autobind } from 'core-decorators'
import { santitizeUser, parseMessage } from './helpers'

export default class DiscordAdapter {
  constructor(teamSettings, plugins) {
    this._settings = teamSettings
    this._parseMessage = parseMessage.bind(this)
    const { auth: { discord_token }, command_prefix, settings } = teamSettings

    this._discord = new Discord.Client({
      fetchAllMembers: settings.fetchAllMembers || false,
      apiRequestMethod: settings.requestMethod || 'sequential',
      messageCacheMaxSize: settings.messageCacheMaxSize || '200',
      messageCacheLifetime: settings.messageCacheLifetime || 0
    })

    this._discord.on('ready', () => {
      console.log('Discord authenticated')
      this._connected = true
      this._canSend = true

      const { users, user } = this._loadUsers()
      Object.assign(this, { _user: user, _users: users })
      this._channels = this._loadChannles()
      this._team = this._loadTeam()

      console.log(`Successfully connected to "${this._team.name}" as "${user.name}"`)
    })

    this._discord.on('reconnect', () => {
      this._connected = false
      this._canSend = false
      console.warn('Discord reconnecting')
    })

    this._discord.on('disconnect', () => {
      this._canSend = false
      this._connected = false
      console.warn('Discord disconnected')
    })

    this._discord.on('message', message => {
      const parsedMessage = this._parseMessage(message)
      if (!parsedMessage) return
      const textWithoutPrefix = parsedMessage.text.charAt(0) === command_prefix ? parsedMessage.text.substring(1) : null
      const parsedText = textWithoutPrefix ? textWithoutPrefix.split(' ').slice(1).join(' ').trim() || undefined : undefined

      // for every plugin
      forEach(plugins, commands => {
        // and every command within the plugin, should really optimize this later.
        commands.forEach(({ trigger, listener, command }) => {
          if (textWithoutPrefix && trigger && trigger.test(textWithoutPrefix)) {
            command.bind(this)({ ...parsedMessage, text: textWithoutPrefix, parsedText }, false)
            return
          }
          if (listener) {
            command.bind(this)(parsedMessage, true)
          }
        })
      })
    })

    this._discord.login(discord_token) // :rocket:
  }

  getChannelByID = id => this._discord.channels.get(id)

  message = {
    send: this._sendMessage,
    sendCustom: this._sendCustomMessage,
    edit: this._editMessage,
    reply: this._replyToMessage
  }

  _canSend = false
  _connected = false

  /* Start of load methods */

  _loadChannles() {
    const channels = {}
    forEach(this._discord.channels.array(), ({ name, id, type, recipient = {} }) => {
      if (type == 'voice') return // lets not keep track of voice channels shall we?
      channels[id] = ({
        name: type == 'dm' ? `#${recipient.username || "Unknown"}` : name,
        type: type == 'text' ? 'channel' : type == 'dm' ? 'dm' : type,
        id
      })
    })
    return channels
  }

  _loadUsers() {
    const { user: { id: activeUserId }, users } = this._discord
    const newUsers = {}
    forEach(users.array(), user => {
      newUsers[user.id] = santitizeUser(user)
    })
    return { users: newUsers, user: newUsers[activeUserId] }
  }

  _loadTeam() {
    return pick(this._discord.guilds.array()[0], ['name', 'id'])
  }

  /* End of load methods */

  /* Start of message methods */

  @autobind
  _replyToMessage({ channel_or_dm_id, user }, message) {
    const { handle } = this._users[user]
    message = `(${handle}) ${message}`
    this._discord.rest.methods.sendMessage(this.getChannelByID(channel_or_dm_id), message)
  }

  @autobind
  _sendMessage(channel_or_dm_id, message) {
    if (typeof message === 'string') {
      this._discord.rest.methods.sendMessage(this.getChannelByID(channel_or_dm_id), message)
    }
  }

  @autobind
  _sendCustomMessage(channel_or_dm_id, message = '', attachments = []) {
    this._discord.rest.methods.sendMessage(this.getChannelByID(channel_or_dm_id), [message, attachments.map(a => a.fallback || 'NO FALLBACK DEFINED')])
  }

  @autobind
  _editMessage() {

  }

  /* End of mmessage Methods */
}
