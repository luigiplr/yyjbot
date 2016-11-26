import request from 'request'

export default {
  id: 'devexcuse',
  commands: [
    {
      trigger: /^(devexcuse|excuse)/,
      listener: false,
      command: devexcuse,
      usage: 'devexcuse|excuse - returns a dev excuse'
    }
  ]
}

const excuseRegex = /<a.*?>(.*?)<\/a>/

function devexcuse(message) {
  request('http://developerexcuses.com/', (err, resp, body) => {
    if (err || !body) {
      this.message.reply(message, 'Error fetching dev excuse, <insert witty dev excuse here>')
      return
    }
    const match = excuseRegex.exec(body)
    this.message.reply(message, match ? match[1] : 'No more excuses')
  })
}
