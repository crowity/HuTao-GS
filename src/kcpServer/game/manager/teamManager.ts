import BaseClass from '#/baseClass'
import Entity from '$/entity'
import Team from '$/player/team'
import Player from '$/player'
import Avatar from '$/entity/avatar'
import Vector from '$/utils/vector'
import { SceneTeamAvatar, TeamEntityInfo } from '@/types/game/team'
import SceneTeamUpdate from '#/packets/SceneTeamUpdate'
import AvatarEquipChange from '#/packets/AvatarEquipChange'
import { ProtEntityTypeEnum } from '@/types/enum/entity'
import { RetcodeEnum } from '@/types/enum/retcode'
import TeamManagerUserData from '@/types/user/TeamManagerUserData'

export default class TeamManager extends BaseClass {
  player: Player

  entity: Entity
  teamList: Team[]

  currentTeam: number

  constructor(player: Player) {
    super()

    this.player = player

    this.entity = new Entity()
    this.entity.entityType = ProtEntityTypeEnum.PROT_ENTITY_TEAM

    this.teamList = [
      new Team(this), // mp team
      new Team(this), // team 1
      new Team(this), // team 2
      new Team(this), // team 3
      new Team(this)  // team 4
    ]

    super.initHandlers(player)
  }

  init(userData: TeamManagerUserData) {
    const { player, teamList } = this
    const { currentTeam, curAvatarGuid, teamGuidList } = userData

    this.currentTeam = currentTeam

    for (let i = 1; i <= 4; i++) {
      const avatarGuidList = teamGuidList?.[i - 1]

      if (avatarGuidList != null) {
        teamList[i].setUpAvatarTeam({
          teamId: i,
          avatarTeamGuidList: avatarGuidList,
          curAvatarGuid: curAvatarGuid || null
        }, true)
      } else {
        teamList[i].setUpAvatarTeam({
          teamId: i,
          avatarTeamGuidList: [
            player.avatarList[0].guid.toString()
          ]
        }, true)
      }
    }
  }

  initNew() {
    const { player, teamList } = this

    this.currentTeam = 1

    for (let i = 1; i <= 4; i++) {
      teamList[i].setUpAvatarTeam({
        teamId: i,
        avatarTeamGuidList: [
          player.avatarList[0].guid.toString()
        ]
      }, true)
    }
  }

  async changeAvatar(avatar: Avatar, pos?: Vector, seqId?: number): Promise<RetcodeEnum> {
    if (!avatar) return RetcodeEnum.RET_CAN_NOT_FIND_AVATAR

    const { player } = this
    const { currentScene } = player
    const { entityManager } = currentScene
    const { motionInfo } = avatar

    const oldAvatar = player.currentAvatar

    if (!avatar.isAlive()) return RetcodeEnum.RET_AVATAR_NOT_ALIVE
    if (avatar === oldAvatar) return RetcodeEnum.RET_AVATAR_IS_SAME_ONE

    player.currentAvatar = avatar

    motionInfo.copy(oldAvatar.motionInfo)
    if (pos != null) motionInfo.pos.copy(pos)

    await entityManager.replace(oldAvatar, avatar, true, seqId)

    return RetcodeEnum.RET_SUCC
  }

  getTeam(teamId?: number, singlePlayer: boolean = false): Team {
    const { player, teamList, currentTeam } = this
    return teamList[player.isInMp() && !singlePlayer ? 0 : (teamId || currentTeam)]
  }

  async setTeam(teamId: number, seqId?: number): Promise<RetcodeEnum> {
    const { player } = this
    const { context, currentScene, currentAvatar } = player

    context.seqId = seqId || null

    if (!currentScene) return RetcodeEnum.RET_CUR_SCENE_IS_NULL
    if (!currentAvatar) return RetcodeEnum.RET_SVR_ERROR
    if (player.isInMp()) return RetcodeEnum.RET_MP_IN_MP_MODE
    if (teamId < 1 || teamId > 4) return RetcodeEnum.RET_CAN_NOT_FIND_TEAM

    this.currentTeam = teamId

    // Get avatar of new team
    const avatarList = this.getTeam().getAvatarList()

    // Send equip change
    for (let avatar of avatarList) await AvatarEquipChange.sendNotify(context, avatar)

    await SceneTeamUpdate.sendNotify(context)

    if (!avatarList.includes(currentAvatar)) {
      avatarList[0].motionInfo.copy(currentAvatar.motionInfo)
      currentScene.entityManager.replace(currentAvatar, avatarList[0])

      player.currentAvatar = avatarList[0]

      await currentScene.entityManager.update()
    }

    return RetcodeEnum.RET_SUCC
  }

  exportAvatarTeamMap(teamId?: number) {
    const { teamList } = this
    const avatarTeamMap = {}

    for (let i = 1; i <= 4; i++) {
      if (teamId != null && i !== teamId) continue

      avatarTeamMap[i] = {
        avatarGuidList: teamList[i].exportGuidList()
      }
    }

    return avatarTeamMap
  }

  exportSceneTeamAvatarList(): SceneTeamAvatar[] {
    const team = this.getTeam()
    return team.getAvatarList().map(avatar => avatar.exportSceneTeamAvatar())
  }

  exportTeamEntityInfo(): TeamEntityInfo {
    const { player, entity } = this

    return {
      teamEntityId: entity.entityId,
      authorityPeerId: player.peerId,
      teamAbilityInfo: {}
    }
  }

  exportUserData(): TeamManagerUserData {
    const { player, currentTeam, teamList } = this

    return {
      currentTeam,
      curAvatarGuid: player.currentAvatar?.guid?.toString() || false,
      teamGuidList: teamList.slice(1, 5).map(team => team.exportGuidList(false, true))
    }
  }
}