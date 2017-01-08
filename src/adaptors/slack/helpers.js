import { get, omitBy, isNil } from 'lodash'
import moment from 'moment'

export function santitizeUser({ id, profile, name: handle }) {
  return {
    handle,
    name: get(profile, 'real_name_normalized', null),
    id
  }
}

function santitizeMessage({ user, text, ts: timestamp, user_profile = null, channel: channel_or_dm_id }) {
  return omitBy({
    user,
    text,
    user_profile,
    timestamp,
    channel_or_dm_id,
    friendlyTimestamp: moment.unix(timestamp).format('h:mm a')
  }, isNil)
}

export function parseMessage({ type, subtype, bot_id, ...messageData }) {
  if (bot_id) return null // we only care about humans.

  switch (subtype ? `${type}:${subtype}` : type) {
    case 'message':
      {
        if (messageData.user_profile) { // sometimes slack sends this along, seesm to be for weird bots.
          const { name: handle, real_name: name, id } = messageData.user_profile
          messageData.user_profile = {
            handle,
            name,
            id
          }
        }

        const msg = omitBy(santitizeMessage(messageData), isNil)
        return msg
      }
    case 'message:message_changed': // user edited a message logic for now just pass through to default:
    default:
      return null
  }
}
