import { Logger } from 'winston'
import { AllHandlers, EventKey } from 'node-napcat-ts'

import { App } from '../app'
import { Command, CommandControl } from './command'
import { create_context_napcat } from './context'

export class Agent<T extends EventKey = EventKey> {
    private loaded: boolean = false
    private commands: Map<string, [Required<Command<T>>, CommandControl]> =
        new Map()

    constructor(
        public app: App,
        public source:
            | {
                  type: 'file'
                  dir: string
                  file: string
              }
            | {
                  type: 'user_command'
                  id: number
              },
        public logger: Logger,
    ) {}

    load_command(cmd: Command<T>) {
        this.unload_command(cmd.name)

        const command: Required<Command<T>> = {
            managed: true,
            disabled: false,
            permission: 'chat',
            symbol: '.' as const,
            pattern: '',
            ...cmd,
        }

        const regex = new RegExp(
            `^${command.symbol}(${command.name})${command.pattern}`,
            'i',
        )

        this.logger.log(
            'info',
            `[Command: ${cmd.name}] Loading... Regex: ${regex}`,
        )
        const fn = async (ctx: AllHandlers[keyof AllHandlers]) => {
            if (!('self_id' in ctx) || !('user_id' in ctx)) {
                return
            }
            if (command.disabled) {
                return
            }
            if (ctx.post_type !== 'message' && ctx.post_type !== 'notice') {
                return
            }
            let match: RegExpMatchArray | null = null
            // match
            if (ctx.post_type === 'message') {
                const first_message = ctx.message[0]
                if (first_message == null || first_message.type !== 'text') {
                    return
                }
                const text = first_message.data.text
                match = text.match(regex)
                this.logger.log(
                    'debug',
                    `Text: ${text} -- Regex: ${regex} -- Match: ${match}`,
                )
                if (match == null) {
                    return
                }
            } else if (ctx.post_type === 'notice') {
                match = null
            }
            // context
            this.logger.log('debug', `Creating context...`)
            const context = create_context_napcat<T>(ctx as AllHandlers[T], {
                app: this.app,
                logger: this.logger,
            })
            if (context == null) {
                return
            }
            // permission
            if (command.permission !== 'any') {
                const { operator, permissions } =
                    typeof command.permission === 'string'
                        ? { operator: 'and', permissions: [command.permission] }
                        : {
                              operator: command.permission[0],
                              permissions: command.permission.slice(1),
                          }
                if (permissions.length === 0) {
                    permissions.push('chat')
                }
                this.logger.log(
                    'debug',
                    `Permissions: ${permissions} -- Operator: ${operator}`,
                )
                if (operator === 'and') {
                    if (
                        permissions.some(
                            (permission) =>
                                !this.app.auth.can(
                                    context.user.id,
                                    context.scope.id,
                                    permission,
                                ),
                        )
                    ) {
                        this.logger.log(
                            'debug',
                            `Permissions denied: ${permissions}`,
                        )
                        return
                    }
                } else if (operator === 'or') {
                    if (
                        permissions.every(
                            (permission) =>
                                !this.app.auth.can(
                                    context.user.id,
                                    context.scope.id,
                                    permission,
                                ),
                        )
                    ) {
                        this.logger.log(
                            'debug',
                            `Permissions denied: ${permissions}`,
                        )
                        return
                    }
                } else {
                    this.logger.log(
                        'warn',
                        `[Command: ${command.name}] Invalid permission operator: ${operator}`,
                    )
                    return
                }
            }
            // handler
            try {
                await cmd.handler(
                    context,
                    match,
                    command.managed ? null : this.app,
                )
            } catch (error) {
                let message = ''
                if (error instanceof Error) {
                    message = `${error.name}: ${error.message}\n${error.stack}`
                } else if (typeof error === 'string') {
                    message = error
                } else {
                    try {
                        message = JSON.stringify(error)
                    } catch {
                        message = error
                    }
                }
                this.logger.log('warn', `[Command: ${command.name}] ${message}`)
                context.notify(
                    error instanceof Error ? error : new Error(String(error)),
                )
                control.unload()
            }
        }

        const control: CommandControl = {
            enable: () => {
                this.logger.log('info', `[Command: ${command.name}] Enabling`)
                command.disabled = false
            },
            disable: () => {
                this.logger.log('info', `[Command: ${command.name}] Disabling`)
                command.disabled = true
            },
            unload: () => {
                this.logger.log('info', `[Command: ${command.name}] Unloading`)
                control.disable()
                this.app.napcat.off(cmd.event, fn)
                this.commands.delete(command.name)
            },
        }

        this.commands.set(command.name, [command, control])
        this.app.napcat.on(cmd.event, fn)
    }

    unload_command(name: string) {
        if (this.commands.has(name)) {
            const [_, control] = this.commands.get(name)!
            control.unload()
        }
    }

    async reload() {
        await this.unload()
        this.logger.log('info', `Agent loading...`)
        try {
            this.loaded = true
            if (this.source.type === 'file') {
                const { commands } = await import(
                    `../${this.source.dir}/${this.source.file}?t=${Date.now()}`
                )
                if (commands == null) {
                    this.logger.log('warn', `No commands found`)
                    return
                }
                for (const command of commands) {
                    this.load_command(command)
                }
            } else if (this.source.type === 'user_command') {
                const uc = this.app.agents.user_command_repository.get({
                    id: this.source.id,
                })
                if (uc == null) {
                    this.logger.log('warn', `User command not found`)
                    return
                }
                this.load_command({
                    event: 'message' as unknown as T,
                    permission: 'chat',
                    symbol: '.',
                    name: uc.name,
                    pattern: uc.pattern,
                    handler: async (context, __m__) => {
                        const match = __m__!.slice(1)
                        const content = uc.content
                        let result: string = ''
                        try {
                            const fn = new Function('context', 'match', content)
                            result = JSON.stringify(fn(context, match))
                        } catch (error) {
                            result = `执行失败: ${error.inspect ? error.inspect() : error}`
                        }
                        await context.reply(result || `成功响应 ${uc.name}`)
                    },
                })
            }
        } catch (error) {
            this.logger.log('error', `Failed to load agent`, error)
            this.unload()
        }
    }

    async unload() {
        if (!this.loaded) {
            return
        }
        this.logger.log('info', `Agent unloading...`)
        this.commands.forEach(([_, control]) => {
            control.unload()
        })
        this.loaded = false
    }
}
