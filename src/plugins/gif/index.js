import Giphy from 'giphy'

export default {
  id: 'gif',
  commands: [
    {
      trigger: /^(gif|giphy)/,
      listener: false,
      command: gif,
      usage: 'giphy|gif - <query>'
    }
  ]
}

function gif(message) {
  const input = message.text.replace(/^(giphy|gif)/, '').trim()
  const giphy = new Giphy(this._settings.auth.giphy_token)

  giphy.search({
    q: input.replace(' ', '+'),
    limit: 4,
    rating: 'r',
    fmt: 'json'
  }, (err, res) => {
    if(err || res.pagination.count === 0) {
      this.message.reply(message, 'No Gifs Found :(')
      return
    }
    this.message.reply(message, res.data[Math.floor(Math.random() * res.pagination.count)].images.fixed_height.url)
  })
}
