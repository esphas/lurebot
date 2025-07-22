import { Logger } from 'winston'
import chokidar, { FSWatcher } from 'chokidar'

import { App } from '../app'
import { Agent } from './agent'
import { UserCommand, UserCommandRepository } from './user_command'

export { Agent }

export class Agents {
    public user_command_repository: UserCommandRepository

    private agents: Map<string, Agent> = new Map()
    private watcher: FSWatcher

    constructor(
        public app: App,
        public dir: string,
        public logger: Logger,
    ) {
        this.watcher = chokidar.watch(this.dir, {
            ignored: /(^|[/\\])\../,
            persistent: true,
        })
        this.user_command_repository = new UserCommandRepository(
            this.app.auth,
            this.app.db,
            this.logger,
        )
    }

    async init() {
        this.watch()
        this.load_all_user_commands()
    }

    async watch() {
        this.watcher.on('add', async (path) => {
            const filename = path.split(/[\\/]/).pop()
            if (filename && filename.endsWith('.ts')) {
                if (this.agents.has(filename)) {
                    await this.agents.get(filename)!.reload()
                } else {
                    const agent = new Agent(
                        this.app,
                        {
                            type: 'file',
                            dir: this.dir,
                            file: filename,
                        },
                        this.logger.child({
                            name: `Agent|File|${filename}`,
                        }),
                    )
                    this.agents.set(filename, agent)
                    await agent.reload()
                }
            }
        })

        this.watcher.on('change', async (path) => {
            const filename = path.split(/[\\/]/).pop()
            if (filename && filename.endsWith('.ts')) {
                if (this.agents.has(filename)) {
                    await this.agents.get(filename)!.reload()
                }
            }
        })

        this.watcher.on('unlink', async (path) => {
            const filename = path.split(/[\\/]/).pop()
            if (filename && filename.endsWith('.ts')) {
                if (this.agents.has(filename)) {
                    await this.agents.get(filename)!.unload()
                    this.agents.delete(filename)
                }
            }
        })
    }

    load_all_user_commands() {
        const ucs = this.user_command_repository.select({})
        for (const uc of ucs) {
            const key = this.user_command_key(uc)
            this.new_user_command_agent(key, uc)
        }
    }

    new_user_command_agent(key: string, uc: UserCommand) {
        const agent = new Agent(
            this.app,
            {
                type: 'user_command',
                id: uc.id,
            },
            this.logger.child({
                name: `Agent|UserCommand|${uc.id}`,
            }),
        )
        this.agents.set(key, agent)
        agent.reload()
    }

    user_command_key(uc: UserCommand) {
        return `user_command_${uc.id}`
    }

    user_command_on(
        name: string,
        pattern: string,
        content: string,
        created_by: number,
    ) {
        const uc = this.user_command_repository.insert({
            name,
            pattern,
            content,
            created_by,
        })!
        const key = this.user_command_key(uc)
        this.new_user_command_agent(key, uc)
        return `用户命令 #${uc.id} 已添加`
    }

    user_command_edit(
        id: number,
        name: string,
        pattern: string,
        content: string,
    ): string {
        const uc = this.user_command_repository.get({ id })
        if (!uc) {
            return `用户命令 #${id} 不存在`
        }
        this.user_command_repository.update({ name, pattern, content }, { id })
        const key = this.user_command_key(uc)
        if (this.agents.has(key)) {
            this.agents.get(key)!.reload()
        } else {
            this.new_user_command_agent(key, uc)
        }
        return `用户命令 #${id} 已修改`
    }

    user_command_off(id: number): string {
        const uc = this.user_command_repository.get({ id })
        if (!uc) {
            return `用户命令 #${id} 不存在`
        }
        this.user_command_repository.delete({ id })
        const key = this.user_command_key(uc)
        if (this.agents.has(key)) {
            this.agents.get(key)!.unload()
            this.agents.delete(key)
        }
        return `用户命令 #${id} 已删除`
    }

    user_command_inspect(id: number): string {
        const uc = this.user_command_repository.get({ id })
        if (!uc) {
            return `用户命令 #${id} 不存在`
        }
        return `用户命令 #${id}: ${uc.name} ${uc.pattern} ${uc.content}`
    }

    user_command_list(user_id: number): string {
        const ucs = this.user_command_repository.select({ created_by: user_id })
        if (ucs.length === 0) {
            return `用户命令列表为空`
        }
        return ucs.map((uc) => `#${uc.id}: ${uc.name} ${uc.pattern}`).join('\n')
    }
}
