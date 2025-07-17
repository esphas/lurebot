import { Agent } from '../agent'
import migrations from '../migrations'

export default async (agent: Agent) => {
    const { auth, db, quick } = agent.app

    agent.on('message', async (context) => {
        if (!auth.isAdmin(context.user_id)) { return }
        
        if (context.raw_message === '!migrate status') {
            db.show_migration_status()
            await quick.reply(context, '迁移状态已输出到日志')
        } else if (context.raw_message === '!migrate history') {
            db.show_migration_history()
            await quick.reply(context, '迁移历史已输出到日志')
        } else if (context.raw_message === '!migrate check') {
            const pending = db.check_migrations(migrations)
            if (pending.length > 0) {
                await quick.reply(context, `发现 ${pending.length} 个待应用的迁移: ${pending.map(m => m.version).join(', ')}`)
            } else {
                await quick.reply(context, '所有迁移已应用')
            }
        } else if (context.raw_message === '!migrate run') {
            try {
                db.run_migrations(migrations)
                await quick.reply(context, '迁移执行完成')
            } catch (error) {
                await quick.reply(context, `迁移执行失败: ${error}`)
            }
        }
    })
} 