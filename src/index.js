import moment from 'moment'
import plugins from './plugins'
import adapters from './adaptors'
import teams from '../teams.json'

global.__DEVELOPMENT__ = process.env.NODE_ENV !== 'production'

if (__DEVELOPMENT__) {
  require('piping')()
}

// Override default log function to add timestamps
['log', 'error'].forEach((method) => {
  const oldMethod = console[method].bind(console)
  console[method] = function() { oldMethod.apply(console, [`<${moment().format('YY-MM-DD HH:mm:ssSS')}>`, ...arguments]) }
})

// tell me more.
process.on('unhandledRejection', (err) => {
  console.error(err)
})

teams.forEach(({ adapter, ...team }) => {
  const teamHandler = new adapters[adapter](team, plugins)
})
