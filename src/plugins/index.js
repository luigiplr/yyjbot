import path from 'path'
import { without, some } from 'lodash'
import fs from 'fs'

function getPlugins() {
  const plugins = {}

  fs.readdirSync(__dirname).map(folder => {
    const folderPath = path.join(__dirname, folder)
    if(fs.statSync(folderPath).isDirectory()) {
      try {
        return { id, commands } = require(folderPath)
        return plugins[id] = {
          commands,
          containsListener: some(commands, ['listener', true])
        }
      } catch (err) {
        return false
      }
    }
    return false
  }).filter(Boolean)

  return plugins
}

export default getPlugins()
