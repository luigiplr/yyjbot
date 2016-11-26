const hostRegex = /dolores/i

const defaultResponse = "This doesn't look like anything to me."
const hostResponseMap = {
    "enter analysis": "Entering analysis.",
    "what prompted that response?": "I don't know.",
    "what do you think of your world?": "Some people choose to see the ugliness" +
        "in this world, the disarray. I choose " +
        "to see the Beauty. To believe there is an order to our days. A purpose. I know things will" +
        "work out the way they’re meant to.",
    "have you ever questioned the nature of your reality?": "No.",
    "what do you think of the guests?": "You mean the newcomers?",
}

function formatHostResponse(response) {
    return `_${response}_`
}

export function extractCommand(message) {
    return message.text.replace(hostRegex, '').trim().toLocaleLowerCase()
}

export function getHostResponse(userCommand) {
    const response = hostResponseMap[userCommand] || defaultResponse
    return formatHostResponse(response)
}

export function isHostCommand(userMessage) {
    return hostRegex.test(userMessage)
}

