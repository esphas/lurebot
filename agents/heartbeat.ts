import { Agent } from '../agent'

export default async (agent: Agent) => {
    const auth = agent.app.auth
    const ncat = agent.app.napcat
    const quick = agent.app.quick

    agent.on('notice.notify.poke', async (context) => {
        if (context.target_id === context.self_id && auth.isUser(context.user_id)) {
            await quick.wait_random(10, 790)
            await ncat.send_poke({
                user_id: context.user_id,
                group_id: 'group_id' in context ? context.group_id : undefined
            })
        }
    })
}
