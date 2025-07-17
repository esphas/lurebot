import { Agent } from "../agent";

export default async (agent: Agent) => {
    const auth = agent.app.auth
    const ncat = agent.app.napcat
    const quick = agent.app.quick

    // claim admin
    if (auth.userCount() === 0) {
        agent.once('message.private', async (context) => {
            if (context.raw_message === '!admin') {
                if (auth.userCount() === 0) {
                    auth.createAdmin(context.user_id)
                    await quick.reply(context, '你已获得管理员权限')
                }
            }
        })
    }

    agent.on('message', async (context) => {
        // admin can add/remove group
        const mMod = context.raw_message.match(/^!(add|allow|remove|deny)\s*(group|group_members|user)\s*([^\s]+)\s*$/)
        if (mMod && auth.isAdmin(context.user_id)) {
            const action = mMod[1] === 'add' || mMod[1] === 'allow' ? 'add' : 'remove'
            const type = mMod[2] as 'group' | 'group_members' | 'user'
            const id = mMod[3]
            if (type === 'group_members') {
                if ('group_id' in context) {
                    const members = await ncat.get_group_member_list({
                        group_id: context.group_id
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
                    await quick.replyError(context)
                }
            } else {
                const result = auth.mod(action, type, id)
                await quick.replyStatus(context, result)
            }
        }
    })

    agent.on('message.group', async (context) => {
        if (context.raw_message === '!register' && auth.isGroupAllowed(context.group_id)) {
            if (!auth.isUser(context.user_id)) {
                auth.createUser(context.user_id)
                await quick.replyOk(context)
            } else {
                await quick.reply(context, '你已经注册过了')
            }
        }
    })
}
