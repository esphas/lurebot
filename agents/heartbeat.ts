import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, napcat } = agent.app

    agent.on('notice.notify.poke', async (context) => {
        if (context.target_id !== context.self_id) { return }
        const { user, group, scope } = auth.from_napcat(context)
        if (!auth.can(user.id, scope.id, 'chat')) { return }

        await napcat.send_poke({
            user_id: user.qq!,
            group_id: group?.qq ?? undefined
        })
    })
}
