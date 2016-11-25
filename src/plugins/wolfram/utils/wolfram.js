import request from 'request'
import { parseString as xml2jsParseString } from 'xml2js'
import { get } from 'lodash'

export function query(input, APIKey) {
  return new Promise((resolve, reject) => {
    request(`http://api.wolframalpha.com/v2/query?input=${input}&primary=true&appid=${APIKey}`, (err, resp, body) => {
      if (!err && body) {
        xml2jsParseString(body, (err, body) => {
          if (err || get(body, 'queryresult.$.error', 'true') === 'false' && get(body, 'queryresult.$.success', 'false') === 'true') {
            let response = get(body, 'queryresult.pod[1].subpod[0].plaintext', undefined)
            if (response) return resolve(response)
            else {
              return reject('Error parsing data')
            }
          } else {
            return reject(get(body, 'queryresult.$.success', false) ? 'No data found' : 'Invalid data returned')
          }
        })
      } else {
        return reject('Error connecting to wolfram api')
      }
    })
  })
}
