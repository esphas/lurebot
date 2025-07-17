import { SqliteError } from 'better-sqlite3'

import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, db, quick } = agent.app

    agent.on('message', async (context) => {
        if (!auth.isAdmin(context.user_id)) { return }
        const mDb = context.raw_message.match(/^!(?:db|sql)\s(.+)$/)
        if (!mDb) { return }
        const sql = mDb[1].trim()
        try {
            const result = db.prepare(sql).run()
            await quick.reply(context, `Result: ${result.changes} rows affected`)
        } catch (error) {
            if (error instanceof SqliteError) {
                await quick.reply(context, `SqliteError: code[${error.code}] message[${error.message}]`)
            } else {
                await quick.reply(context, `Error: ${error}`)
            }
        }
    })
}
