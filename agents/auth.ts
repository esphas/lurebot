import { Agent } from '../agent'
import { User } from '../auth/user'

export default async (agent: Agent) => {
    const { auth, napcat, quick } = agent.app

    // claim admin
    if (auth.user.count({ registered: true }) === 0) {
        agent.on('message.private', async (context) => {
            if (context.raw_message === '!admin') {
                if (auth.user.count({ registered: true }) === 0) {
                    const { user } = auth.from_napcat(context)
                    auth.user.register(user.id)
                    auth.assign(user.id, auth.scope.global().id, 'admin')
                    await quick.reply(context, '你已获得管理员权限')
                }
            }
        })
    }

    agent.on('message', async (context) => {
        const match = context.raw_message.match(/^!(add|allow|remove|deny)\s*(group|user|all)(\s.+)$/)
        if (!match) { return }
        const { user, group, scope } = auth.from_napcat(context)
        if (!auth.can(user.id, scope.id, 'root')) { return }

        const command = match[1] === 'add' || match[1] === 'allow' ? 'add' : 'remove'
        const type = match[2] as 'group' | 'user' | 'all'
        const arg = match[3].trim()

        if (type === 'group') {
            let group_qq = group?.qq ?? 0
            if (arg.length > 0) {
                group_qq = Number(arg.match(/^\d+$/)?.[0])
            }
            if (group_qq === 0 || isNaN(group_qq)) {
                await quick.reply(context, '无效的群号')
                return
            }
            const new_group = auth.group.from_napcat({ group_id: group_qq })!
            if (command === 'add') {
                auth.group.register(new_group.id)
            } else {
                auth.group.unregister(new_group.id)
            }
            await quick.reply(context, `ok, ${command} ${new_group.qq}`)
        } else if (type === 'user') {
            let user_qq = user?.qq ?? 0
            if (arg.length > 0) {
                user_qq = Number(arg.match(/^\d+$/)?.[0])
            }
            if (user_qq === 0 || isNaN(user_qq)) {
                await quick.reply(context, '无效的 QQ 号')
                return
            }
            const new_user = auth.user.from_napcat({ user_id: user_qq })
            if (command === 'add') {
                auth.user.register(new_user.id)
            } else {
                auth.user.unregister(new_user.id)
            }
            await quick.reply(context, `ok, ${command} ${new_user.qq}`)
        } else {
            let group_qq = group?.qq ?? 0
            if (arg.length > 0) {
                group_qq = Number(arg.match(/^\d+$/)?.[0])
            }
            if (group_qq === 0 || isNaN(group_qq)) {
                await quick.reply(context, '无效的群号')
                return
            }
            const members = (await napcat.get_group_member_list({
                group_id: group_qq
            })).map(member => auth.user.from_napcat({ user_id: member.user_id }))
            const users: User[] = []
            let success = 0
            if (command === 'add') {
                for (const member of members) {
                    users.push(...auth.user.register(member.id))
                }
                success = users.filter(user => user.registered).length
            } else {
                for (const member of members) {
                    users.push(...auth.user.unregister(member.id))
                }
                success = users.filter(user => !user.registered).length
            }
            await quick.reply(context, `ok, ${command} ${group_qq} ${success}/${members.length}`)
        }
    })

    agent.on('message.group', async (context) => {
        const match = context.raw_message.match(/^!(register|unregister)\s*$/)
        if (!match) { return }
        const { user, group } = auth.from_napcat(context)
        if (!auth.group.is_registered(group!.id)) { return }

        const command = match[1]
        if (command === 'register') {
            if (auth.user.is_registered(user.id)) {
                await quick.reply(context, '你已注册')
            } else {
                auth.user.register(user.id)
                await quick.reply(context, '注册成功')
            }
        } else {
            if (auth.user.is_registered(user.id)) {
                auth.user.unregister(user.id)
                await quick.reply(context, '注销成功')
            } else {
                await quick.reply(context, '你未注册')
            }
        }
    })

    agent.on('message', async (context) => {
        const match = context.raw_message.match(/^!(error_notify)\s*(on|off)?\s*$/)
        if (!match) { return }
        const { user } = auth.from_napcat(context)
        if (!auth.user.is_registered(user.id)) { return }

        const assign = match[2] === 'on'
        auth.user.update({ error_notify: assign }, { id: user.id })
        await quick.reply(context, `错误通知已${assign ? '开启' : '关闭'}`)
    })
}
