import { forEach, get, pick, keys } from 'lodash'
import { WebClient, RtmClient, MemoryDataStore, CLIENT_EVENTS, RTM_EVENTS } from '@slack/client'
import { autobind } from 'core-decorators'
import { santitizeUser, parseMessage } from './helpers'

export default class SlackAdaptor {
  constructor(teamSettings, plugins) {
    this._settings = teamSettings
    this._parseMessage = parseMessage.bind(this)
    const { auth: { slack_token }, command_prefix } = teamSettings

    this._slack = new RtmClient(slack_token, {
      logLevel: 'error',
      dataStore: new MemoryDataStore(),
      autoReconnect: true,
      autoJoinNewChannels: false
    })

    this._slack.on(CLIENT_EVENTS.RTM.AUTHENTICATED, () => {
      this._connected = true
      this._slack._webClient = new WebClient(slack_token)
      console.log('Slack authenticated')
    })

    this._slack.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, () => {
      this._connected = false
      this._canSend = false
      console.warn('Slack reconnecting')
    })

    this._slack.on(CLIENT_EVENTS.RTM.DISCONNECT, () => {
      this._canSend = false
      this._connected = false
      console.warn('Slack disconnected')
    })

    this._slack.on(CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, () => {
      this._canSend = false
      this._connected = false
      console.error('o shit dawg, slack suffered some catastrophic error.')
    })

    this._slack.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
      this._canSend = true

      const { users, user } = this._loadUsers()
      Object.assign(this, { _user: user, _users: users })
      this._channels = this._loadChannles()
      this._team = this._loadTeam()

      console.log(`Successfully connected to "${this._team.name}" as "${user.name}"`)
    })

    this._slack.on(RTM_EVENTS.MESSAGE, message => {
      const parsedMessage = this._parseMessage(message)
      if (!parsedMessage) return
      const textWithoutPrefix = parsedMessage.text.charAt(0) === command_prefix ? parsedMessage.text.substring(1) : null
      // for every plugin
      forEach(plugins, commands => {
        // and every command within the plugin, should really optimize this later.
        commands.forEach(({ trigger, listener, command }) => {
          if (textWithoutPrefix && trigger && trigger.test(textWithoutPrefix)) {
            command.bind(this)({ ...parsedMessage, text: textWithoutPrefix }, false)
            return
          }
          if (listener) {
            command.bind(this)(parsedMessage, true)
          }
        })
      })
    })

    this._slack.start() // :rocket:
  }

  message = {
    send: this._sendMessage,
    edit: this._editMessage,
    reply: this._replyToMessage
  }

  _canSend = false
  _connected = false

  /* Start of load methods */

  _loadChannles() {
    const { _users, _slack } = this
    const channels = {}
    forEach({ ..._slack.dataStore.channels, ..._slack.dataStore.groups }, ({ is_archived, is_open, name, id }) => {
      if (is_archived || id.startsWith('G')) return // lets not keep track of archived channels shall we?
      channels[id] = ({
        name: id.startsWith('G') ? name : `#${name}`,
        id
      })
    })
    return channels
  }

  _loadUsers() {
    const { activeUserId, dataStore } = this._slack
    const users = {}
    forEach(dataStore.users, user => {
      if (!get(user, 'deleted', false)) {
        users[user.id] = santitizeUser(user)
      }
    })
    return { users, user: users[activeUserId] }
  }

  _loadTeam() {
    return pick(this._slack.dataStore.teams[keys(this._slack.dataStore.teams)[0]], ['name', 'id'])
  }

  /* End of load methods */

  /* Start of message methods */

  @autobind
  _replyToMessage({ channel_or_dm_id, user }, message) {
    const { handle } = this._users[user]
    if (typeof message === 'string') {
      message = `(${handle}) ${message}`
    } else {
      message.text = `(${handle}) ${message.text}`
    }
    this._sendMessage(channel_or_dm_id, message)
  }

  @autobind
  _sendMessage(channel_or_dm_id, message) {
    if (typeof message === 'string') {
      this._slack.sendMessage(message, channel_or_dm_id)
    }
  }

  @autobind
  _editMessage() {

  }

  /* End of mmessage Methods */
}
