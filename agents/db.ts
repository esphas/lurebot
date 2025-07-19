import { SqliteError } from 'better-sqlite3'

import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, db, quick } = agent.app

    agent.on('message', async (context) => {
        const match = context.raw_message.match(/^!(db|sql)\s((?:.|\n)+)$/)
        if (!match) { return }
        const { user } = auth.from_napcat(context)
        if (!auth.can(user.id, auth.scope.global().id, 'root')) { return }
        
        const cmd = match[1]
        const sql = match[2].trim()

        try {
            if (cmd === 'db') {
                const result = db.prepare(sql).run()
                await quick.reply(context, `Result: ${result.changes} rows affected`)
            } else {
                const result = db.prepare(sql).all()
                await quick.reply(context, `Result: ${JSON.stringify(result)}`)
            }
        } catch (error) {
            if (error instanceof SqliteError) {
                await quick.reply(context, `SqliteError: code[${error.code}] message[${error.message}]`)
            } else {
                await quick.reply(context, `Error: ${error}`)
            }
        }
    })
}
