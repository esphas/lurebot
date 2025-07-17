import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, napcat: ncat, quick } = agent.app

    agent.on('message', async (context) => {
        if (!auth.isRegisteredUser(context.user_id)) { return }
        const mHitokoto = context.raw_message.match(/^.(?:htkt|hitokoto|一言)\s*(.+)?$/)
        if (mHitokoto) {
            const c = mHitokoto[1]?.split(',').map(x => `c=${x.trim()}`).join('&') || 'c=k'
            const response = await fetch(`https://v1.hitokoto.cn/?${c}&encode=json`)
            if (response.ok) {
                const hitokoto = await response.json()
                const text = `${hitokoto.hitokoto}\n——${hitokoto.from_who || '佚名'}${hitokoto.from ? `(${hitokoto.from})` : ''}`
                await quick.reply(context, text)
            } else {
                await quick.replyError(context)
                await quick.log_error(context, `一言请求失败: ${response.status} ${response.statusText}\n${response.url}`)
            }
        }
    })
}
