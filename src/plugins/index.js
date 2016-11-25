import path from 'path'
import { without, some } from 'lodash'
import fs from 'fs'

function getPlugins() {
  const plugins = {}

  fs.readdirSync(__dirname).map(folder => {
    const folderPath = path.join(__dirname, folder)
    if(fs.statSync(folderPath).isDirectory()) {
      try {
        const { id, commands } = require(folderPath)
        plugins[id] = commands
      } catch (err) {
        console.error(`Error loading plugin "${folderPath}"`, err)
      }
    }
  })

  return plugins
}

export default getPlugins()
