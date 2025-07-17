import { EventHandleMap, EventKey } from 'node-napcat-ts'
import { App } from './app'

export type AgentCore = (agent: Agent) => Promise<void>

export class Agent {

    private loaded: boolean = false
    private listeners: Map<EventHandleMap[EventKey], [event: EventKey, fn: EventHandleMap[EventKey]]> = new Map()

    constructor(public app: App, public dir: string, public file: string) {
    }

    on<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        /** @ts-ignore */
        if (this.listeners.has(handler)) {
            return
        }
        this.app.logger.log('debug', `Registering event ${event} for agent ${this.file}`)
        const fn: EventHandleMap[T] = async (context) => {
            try {
                await handler(context)
            } catch (error) {
                this.app.logger.log('error', `Error in agent ${this.file} on event ${event}:`, error)
                this.app.napcat.off(event, fn)
                this.listeners.delete(handler)
            }
        }
        this.app.napcat.on(event, fn)
        this.listeners.set(handler, [event, fn])
    }

    off<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        if (this.listeners.has(handler)) {
            /** @ts-ignore */
            const [event, fn] = this.listeners.get(handler)!
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        }
    }

    once<T extends EventKey>(event: T, handler: EventHandleMap[T]) {
        /** @ts-ignore */
        if (this.listeners.has(handler)) {
            return
        }
        this.app.logger.log('debug', `Registering event ${event} for agent ${this.file}`)
        const fn: EventHandleMap[T] = async (context) => {
            try {
                await handler(context)
            } catch (error) {
                this.app.logger.log('error', `Error in agent ${this.file} on event ${event}:`, error)
            }
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        }
        this.app.napcat.on(event, fn)
        this.listeners.set(handler, [event, fn])
    }

    async reload() {
        await this.unload()
        this.app.logger.log('info', `Loading agent: ${this.file}`)
        try {
            this.loaded = true
            const core = (await import(`./agents/${this.file}?t=${Date.now()}`)).default
            if (core && typeof core === 'function') {
                const coreFn = core as AgentCore
                await coreFn(this)
            }
        } catch (error) {
            this.app.logger.log('error', `Failed to load agent: ${this.file}`, error)
            this.unload()
        }
    }

    async unload() {
        if (!this.loaded) {
            return
        }
        this.app.logger.log('info', `Unloading agent: ${this.file}`)
        this.listeners.forEach(([event, fn], handler) => {
            this.app.napcat.off(event, fn)
            this.listeners.delete(handler)
        })
        this.loaded = false
    }
}
