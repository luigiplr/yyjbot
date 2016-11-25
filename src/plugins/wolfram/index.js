import { query } from './utils/wolfram'

function wolfram(message) {
  const input = message.text.replace(/^(calc|wolfram)/, '').trim()
  query(input, this._settings.auth.wolfram_token).then(resp => {
    this.message.reply(message, `*Result*: ${resp}`)
  }, error => {
    this.message.reply(message, error)
  })
}

export default {
  id: 'wolfram',
  commands: [
    {
      trigger: /^(calc|wolfram)/,
      listener: false,
      command: wolfram,
      usage: 'wolfram|calc <query> - returns wolfram calculation for query'
    }
  ]
}
