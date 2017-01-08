import { omitBy, isNil } from 'lodash'
import moment from 'moment'

export function santitizeUser({ id, username: handle }) {
  return {
    handle,
    name: handle, // Discords name is the same as their handle (username)
    id
  }
}

function santitizeMessage({ user, text, ts: timestamp, channel: channel_or_dm_id }) {
  return omitBy({
    user,
    text,
    timestamp,
    channel_or_dm_id,
    friendlyTimestamp: moment.unix(timestamp).format('h:mm a')
  }, isNil)
}

export function parseMessage({ author: { id, bot }, createdTimestamp, content, channel: { id: channel } }) {
  if (bot) return null // we only care about humans.
  const messageData = {
    user: id,
    text: content,
    ts: createdTimestamp,
    channel
  }
  const msg = omitBy(santitizeMessage(messageData), isNil)
  return msg
}
