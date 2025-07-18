import { Agent } from '../agent'

export default async (agent: Agent) => {
    const auth = agent.app.auth
    const ncat = agent.app.napcat
    const quick = agent.app.quick

    // claim admin
    if (auth.userCount() === 0) {
        agent.on('message.private', async (context) => {
            if (auth.userCount() === 0) {
                if (context.raw_message === '!admin') {
                    auth.createAdmin(context.user_id)
                    await quick.reply(context, '你已获得管理员权限')
                }
            }
        })
    }

    agent.on('message', async (context) => {
        if (!auth.isAdmin(context.user_id)) { return }

        // admin can add/remove group
        const mMod = context.raw_message.match(/^!(add|allow|remove|deny)\s*(group|group_members|user)\s*([^\s]+)\s*$/)
        if (mMod) {
            const action = mMod[1] === 'add' || mMod[1] === 'allow' ? 'add' : 'remove'
            const type = mMod[2] as 'group' | 'group_members' | 'user'
            const id = mMod[3]
            if (type === 'group_members') {
                const members = await ncat.get_group_member_list({
                    group_id: Number(id)
                })
                let failed: number[] = []
                for (const member of members) {
                    const result = auth.mod(action, 'user', member.user_id)
                    if (!result) {
                        failed.push(member.user_id)
                    }
                }
                if (failed.length > 0) {
                    await quick.reply(context, `失败: ${failed.join(', ')}`)
                } else {
                    await quick.replyOk(context)
                }
            } else {
                const result = auth.mod(action, type, id)
                await quick.replyStatus(context, result)
            }
        }
    })

    agent.on('message.group', async (context) => {
        if (!auth.isRegisteredGroup(context.group_id)) { return }

        if (context.raw_message === '!register') {
            if (!auth.isRegisteredUser(context.user_id)) {
                auth.mod('add', 'user', context.user_id)
                await quick.replyOk(context)
            } else {
                await quick.reply(context, '你已经注册过了')
            }
        }
    })

    agent.on('message', async (context) => {
        if (!auth.isRegisteredUser(context.user_id)) { return }

        const m_error_report_listener = context.raw_message.match(/^!(error_report_listener)\s*(on|off)?\s*$/)
        if (m_error_report_listener) {
            const assign = m_error_report_listener[2] !== 'off'
            auth.assign_error_report_listener(context.user_id, assign)
            await quick.reply(context, `错误报告监听已${assign ? '开启' : '关闭'}`)
        }
    })
}
