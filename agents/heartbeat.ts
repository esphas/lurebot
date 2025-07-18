import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, napcat: ncat, quick } = agent.app

    agent.on('notice.notify.poke', async (context) => {
        if (context.target_id === context.self_id && auth.can(context, 'chat')) {
            await quick.wait_random(10, 790)
            await ncat.send_poke({
                user_id: context.user_id,
                group_id: 'group_id' in context ? context.group_id : undefined
            })
        }
    })
}
