import config from '@/config'
import Logger from '@/logger'
import { QueryCurrRegionHttpRsp } from '@/types/dispatch/curRegion'
import { RetcodeEnum } from '@/types/enum/Retcode'
import DispatchKey from '@/utils/dispatchKey'
import { fileExists } from '@/utils/fileSystem'
import { rsaDecrypt } from '@/utils/rsa'
import * as dns from 'dns'
import { existsSync, writeFileSync } from 'fs'
import { get } from 'https'
import { join } from 'path'
import { cwd } from 'process'
import * as protobuf from 'protobufjs'
const { Resolver } = dns.promises

const hostMap = {
  'OSREL': 'osasiadispatch',
  'CNCB': 'cnbeta01dispatch'
}

const host = `${hostMap[config.dispatchRegion]}.yuanshen.com`
const protoPath = join(cwd(), `data/proto/QueryCurrRegionHttpRsp.proto`)
const binFilePath = join(cwd(), `data/bin/${config.version}/QueryCurrRegionHttpRsp.bin`)

const logger = new Logger('UPDATE')

async function decryptResponse(keyId: number, data: string): Promise<string> {
  if (keyId == null || data?.[0] !== '{') return data

  try {
    const response = JSON.parse(data)
    const encryptKeyPair = await DispatchKey.getEncryptKeyPair(keyId)

    return rsaDecrypt(
      encryptKeyPair.private.pem,
      Buffer.from(response.content, 'base64')
    ).toString('base64')
  } catch (err) {
    logger.error(err)
    return data
  }
}

function query(ip: string) {
  const { version, dispatchSeed, dispatchKeyId } = config
  const keyId = dispatchKeyId ? `&key_id=${dispatchKeyId}` : ''

  return new Promise<void>((resolve, reject) => {
    const path = `/query_cur_region?version=${config.dispatchRegion}Win${version}&lang=3&platform=3&binary=1&time=38&channel_id=1&sub_channel_id=0&account_type=1&dispatchSeed=${dispatchSeed}${keyId}`
    logger.debug('(QueryCurrRegion) Host:', host, 'Path:', path)
    get(`https://${ip}${path}`, {
      headers: {
        'Host': host,
        'User-Agent': 'UnityPlayer/2017.4.30f1 (UnityWebRequest/1.0, libcurl/7.51.0-DEV)',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Unity-Version': '2017.4.30f1'
      }
    }, res => {
      const { statusCode } = res
      if (statusCode !== 200) {
        // Consume response data to free up memory
        res.resume()

        return reject(`HTTP ${statusCode}`)
      }

      let data = ''

      res.setEncoding('utf8')
      res.on('error', err => reject(`IP: ${ip} Host: ${host} Error: ${err.message}`))
      res.on('data', chunk => data += chunk)
      res.on('end', async () => {
        try {
          const buf = Buffer.from(await decryptResponse(dispatchKeyId, data), 'base64')

          const root = await protobuf.load(protoPath)
          const type = root.lookupType('QueryCurrRegionHttpRsp')
          const message = type.decode(buf)
          const curRegionRsp = <QueryCurrRegionHttpRsp>message.toJSON()

          const retcode = curRegionRsp.retcode || 0
          if (retcode !== RetcodeEnum.RET_SUCC) return reject(`Query failed: ${RetcodeEnum[retcode]}`)

          logger.debug('Writing to:', binFilePath)
          writeFileSync(binFilePath, buf)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', err => reject(`IP: ${ip} Host: ${host} Error: ${err.message}`))
  })
}

export const checkForUpdate = async (): Promise<boolean> => {
  if (existsSync(binFilePath)) return true

  return update()
}

export const update = async (): Promise<boolean> => {
  try {
    if (!await fileExists(protoPath)) throw new Error('Missing proto file.')
    if (config.dispatchSeed == null) throw new Error('Missing dispatch seed.')

    const r = new Resolver()

    r.setServers(config.nameservers)

    const ip = (await r.resolve4(host))?.[0]
    logger.debug('(QueryCurrRegion) Resolved:', ip)

    await query(ip)

    return true
  } catch (err) {
    logger.error(err)
    return false
  }
}

export default {
  checkForUpdate,
  update
}