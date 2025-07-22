import { Logger } from 'winston'
import chokidar, { FSWatcher } from 'chokidar'

import { App } from '../app'
import { Agent } from './agent'

export { Agent }

export class Agents {
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
                        this.dir,
                        filename,
                        this.logger,
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
}
