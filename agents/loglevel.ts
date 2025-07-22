import { Command } from '../agent/command'

export const commands = [
    {
        managed: false,
        event: 'message',
        permission: 'root',
        symbol: '!',
        name: 'loglevel',
        pattern: '(debug|info|warn|error)',
        handler: async (context, match, app) => {
            const level = match![1] as 'debug' | 'info' | 'warn' | 'error'
            app!.logger.level = level
            await context.reply(`日志级别已设置为 ${level}`)
        },
    } as Command<'message'>,
] as Command[]
