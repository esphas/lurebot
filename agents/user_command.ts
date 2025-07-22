import { Command } from '../agent/command'

export const commands = [
    {
        managed: false,
        event: 'message',
        permission: 'user_command',
        symbol: '#',
        name: 'ucon',
        pattern: '\\s+([^\\s]+)\\s+([^\\s]+)[\\s\\n]+((?:.|\\n)+)',
        handler: async (context, match, app) => {
            const name = match![2]
            const pattern = match![3]
            const content = match![4]
            const reply = app!.agents.user_command_on(
                name,
                pattern,
                content,
                context.user.id,
            )
            await context.reply(reply)
        },
    } as Command<'message'>,
    {
        managed: false,
        event: 'message',
        permission: 'user_command',
        symbol: '#',
        name: 'ucedit',
        pattern: '\\s+(\\d+)\\s+([^\\s]+)\\s+([^\\s]+)[\\s\\n]+((?:.|\\n)+)',
        handler: async (context, match, app) => {
            const id = Number(match![2])
            const name = match![3]
            const pattern = match![4]
            const content = match![5]
            const reply = app!.agents.user_command_edit(
                id,
                name,
                pattern,
                content,
            )
            await context.reply(reply)
        },
    } as Command<'message'>,
    {
        managed: false,
        event: 'message',
        permission: 'user_command',
        symbol: '#',
        name: 'ucoff',
        pattern: '\\s+(\\d+)',
        handler: async (context, match, app) => {
            const id = Number(match![2])
            const reply = app!.agents.user_command_off(id)
            await context.reply(reply)
        },
    } as Command<'message'>,
    {
        managed: false,
        event: 'message',
        permission: 'user_command',
        symbol: '#',
        name: 'ucinspect',
        pattern: '\\s+(\\d+)',
        handler: async (context, match, app) => {
            const id = Number(match![2])
            const reply = app!.agents.user_command_inspect(id)
            await context.reply(reply)
        },
    } as Command<'message'>,
    {
        managed: false,
        event: 'message',
        permission: 'user_command',
        symbol: '#',
        name: 'uclist',
        pattern: '(\\s+\\d+)?',
        handler: async (context, match, app) => {
            const user_id = match![2] ? Number(match![2]) : context.user.id
            const reply = app!.agents.user_command_list(user_id)
            await context.reply(reply)
        },
    } as Command<'message'>,
] as Command[]
