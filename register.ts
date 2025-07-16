import chokidar from 'chokidar'
import { EventHandleMap, EventKey } from 'node-napcat-ts'
import { App } from './app'

import path from 'path'

export function register(app: App) {
    const registered = new Map<string, [event: EventKey, fn: EventHandleMap[EventKey]][]>()

    const onFile = (file: string) => {
        const fns: [event: EventKey, fn: EventHandleMap[EventKey]][] = []
        registered.set(file, fns)
        return <T extends EventKey>(event: T, fn: EventHandleMap[T]) => {
            console.log(`Registering event: ${event}`)
            /** @ts-ignore */
            const safeFn: EventHandleMap[T] = async (context) => {
                try {
                    await fn(context)
                } catch (error: unknown) {
                    app.napcat.off(event, safeFn)
                    fns.splice(fns.indexOf([event, safeFn]), 1)
                    console.error(`Error in handler ${file} on event ${event}:`, error)
                }
            }
            app.napcat.on(event, safeFn)
            fns.push([event, safeFn])
        }
    }

    const offFile = (file: string) => {
        if (registered.has(file)) {
            const fns = registered.get(file)
            fns?.forEach(([event, fn]) => {
                app.napcat.off(event, fn)
            })
            registered.delete(file)
        }
    }
    
    const registerDir = path.join(process.cwd(), 'registers')
    const registerFile = async (file: string) => {
        console.log(`Loading handler: ${file}`)
        try {
            const handler = await import(`./registers/${file}?t=${Date.now()}`)
            if (handler.register && typeof handler.register === 'function') {
                offFile(file)
                const on = onFile(file)
                await handler.register(app, on)
            }
        } catch (error) {
            offFile(file)
            console.error(`Failed to load handler ${file}:`, error)
        }
    }

    const watcher = chokidar.watch(registerDir, {
        ignored: /(^|[\/\\])\../,
        persistent: true
    })

    watcher.on('change', async (path) => {
        console.log(`File changed: ${path}`)
        const file = path.split(/[\\/]/).pop()
        if (file && file.endsWith('.ts')) {
            await registerFile(file)
        }
    })

    watcher.on('add', async (path) => {
        console.log(`File added: ${path}`)
        const file = path.split(/[\\/]/).pop()
        if (file && file.endsWith('.ts')) {
            await registerFile(file)
        }
    })

    watcher.on('unlink', async (path) => {
        console.log(`File removed: ${path}`)
        const file = path.split(/[\\/]/).pop()
        if (file && file.endsWith('.ts')) {
            offFile(file)
        }
    })
}
