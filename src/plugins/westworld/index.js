import { extractCommand, getHostResponse, isHostCommand } from './utils/westworld'

function westworld(message) {
    // Only reply to direct commands
    const firstWord = message.text.split(" ")[0]
    // Separate host name from command
    const command = extractCommand(message)

    if (isHostCommand(firstWord)) this.message.send(message.channel_or_dm_id, getHostResponse(command))
}

export default {
    id: 'westworld',
    commands: [
        {
            trigger: /^westworld/,
            listener: true,
            command: westworld,
            usage: 'westworld - Enter diagnostic mode for a host'
        }
    ]
}
