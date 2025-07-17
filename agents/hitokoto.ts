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
                const data = await response.json()
                const hitokoto = data.hitokoto
                const from = [data.from_who, data.from].filter(x => x != null).join(' ').trim()
                const text = `${hitokoto}${from ? `\n            ——${from}` : ''}`
                await quick.reply(context, text)
            } else {
                await quick.replyError(context)
                await quick.log_error(context, `一言请求失败: ${response.status} ${response.statusText}\n${response.url}`)
            }
        }
    })
}
