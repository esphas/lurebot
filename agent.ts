import { Logger } from 'winston'
import { EventHandleMap, EventKey, SocketHandler } from 'node-napcat-ts'
import chokidar, { FSWatcher } from 'chokidar'

import { App } from './app'

export type AgentCore = (agent: Agent) => Promise<void>

export class Agent {
    private loaded: boolean = false
    private listeners: Map<EventHandleMap[EventKey], [event: EventKey, fn: EventHandleMap[EventKey]]> = new Map()

    constructor(public app: App, public dir: string, public file: string, public logger: Logger) {
    }

    on<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        if (this.listeners.has(handler as EventHandleMap[EventKey])) {
            return
        }
        this.logger.log('debug', `Registering event ${event} for agent ${this.file}`)
        /** @ts-ignore */
        const fn: EventHandleMap[T] = async (context) => {
            try {
                await handler(context)
            } catch (error) {
                const details = `Error in agent ${this.file} on event ${event}: ${error}`
                this.logger.log('error', details)
                this.app.quick.log_error(context, details)
                this.app.napcat.off(event, fn)
                this.listeners.delete(handler)
            }
        }
        this.app.napcat.on(event, fn)
        this.listeners.set(handler, [event as EventKey, fn])
    }

    off<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        if (this.listeners.has(handler)) {
            const [event, fn] = this.listeners.get(handler as EventHandleMap[EventKey])!
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        }
    }

    once<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        if (this.listeners.has(handler)) {
            return
        }
        this.logger.log('debug', `Registering event ${event} for agent ${this.file}`)
        const fn: EventHandleMap[T] = async (context) => {
            try {
                await handler(context)
            } catch (error) {
                const details = `Error in agent ${this.file} on event ${event}: ${error}`
                this.logger.log('error', details)
                this.app.quick.log_error(context, details)
            }
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        }
        this.app.napcat.on(event, fn)
        this.listeners.set(handler, [event, fn])
    }

    async reload() {
        await this.unload()
        this.logger.log('info', `Loading agent: ${this.file}`)
        try {
            this.loaded = true
            const core = (await import(`./${this.dir}/${this.file}?t=${Date.now()}`)).default
            if (core && typeof core === 'function') {
                const coreFn = core as AgentCore
                await coreFn(this)
            }
        } catch (error) {
            this.logger.log('error', `Failed to load agent: ${this.file}`, error)
            this.unload()
        }
    }

    async unload() {
        if (!this.loaded) {
            return
        }
        this.logger.log('info', `Unloading agent: ${this.file}`)
        this.listeners.forEach(([event, fn], handler) => {
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        })
        this.loaded = false
    }
}

export class Agents {
    private agents: Map<string, Agent> = new Map()
    private watcher: FSWatcher

    constructor(public app: App, public dir: string, public logger: Logger) {
    }

    async watch() {
        this.watcher = chokidar.watch(this.dir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        })

        this.watcher.on('add', async (path) => {
            const filename = path.split(/[\\/]/).pop()
            if (filename && filename.endsWith('.ts')) {
                if (this.agents.has(filename)) {
                    await this.agents.get(filename)!.reload()
                } else {
                    const agent = new Agent(this.app, this.dir, filename, this.logger)
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
