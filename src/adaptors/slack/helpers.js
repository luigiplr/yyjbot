import { filter, get, last, omitBy, isNil } from 'lodash'
import path from 'path'
import moment from 'moment'

export function santitizeUser({ id, profile, name: handle }) {
  return {
    handle,
    name: get(profile, 'real_name_normalized', null),
    id
  }
}

function santitizeMessage({ user, text, ts: timestamp, user_profile: userProfile = null }) {
  return omitBy({
    user,
    text,
    userProfile,
    timestamp,
    friendlyTimestamp: moment.unix(timestamp).format('h:mm a')
  }, isNil)
}

export function parseMessage({ type, subtype, team, channel, bot_id, ...messageData }, trigger) {
  if (Boolean(bot_id)) return null // we only care about humans.

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
        console.log(messageData)
        const msg = omitBy(santitizeMessage.bind(this)(messageData), isNil)
        return msg
      }
    case 'message:message_changed':
      // user edited a message logic for now just pass through to default:
    default:
      return null
  }
}
