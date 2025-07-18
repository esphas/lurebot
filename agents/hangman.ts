import { Agent } from '../agent'
import { AuthPermission } from '../auth'

export default async (agent: Agent) => {
    const { auth, napcat: ncat, quick, sessions } = agent.app

    agent.on('message', async (context) => {
        if (!auth.can(context.user_id, 'group_id' in context ? context.group_id : null, AuthPermission.Chat)) {
            return
        }
        const mHangman = context.raw_message.match(/^.(?:hangman|猜词)\s*$/)
        if (!mHangman) {
            return
        }

        const user_id = context.user_id
        const group_id = 'group_id' in context ? context.group_id : null

        const session = await sessions.get_or_create_session('hangman', user_id, group_id)
    })
}
