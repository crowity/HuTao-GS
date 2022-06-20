import Avatar from '$/entity/avatar'
import newGuid from '$/utils/newGuid'
import { EquipInterface } from '@/types/game/item'
import EquipUserData, { EquipTypeEnum } from '@/types/user/EquipUserData'

export default class Equip {
  guid: bigint
  itemId: number
  type: EquipTypeEnum

  equipped?: Avatar

  isLocked: boolean

  constructor(itemId: number, guid?: bigint, type: EquipTypeEnum = EquipTypeEnum.NONE) {
    this.itemId = itemId
    this.guid = guid || newGuid()
    this.type = type
  }

  init(userData: EquipUserData) {
    const { guid, itemId, type, isLocked } = userData

    this.guid = BigInt(guid)
    this.itemId = itemId
    this.type = type
    this.isLocked = isLocked
  }

  initNew() {
    this.isLocked = false
  }

  // placeholder
  export(): EquipInterface { return null }

  exportUserData(): EquipUserData {
    const { guid, itemId, type, isLocked } = this

    return {
      guid: guid.toString(),
      itemId,
      type,
      isLocked
    }
  }
}