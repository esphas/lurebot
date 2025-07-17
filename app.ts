import { format, Logger, transports } from 'winston'
import { NCWebsocket } from 'node-napcat-ts'
import Database from 'better-sqlite3'
import chokidar, { FSWatcher } from 'chokidar'

import { Auth } from './auth'
import { Agent } from './agent'
import { Quick } from './quick'

export interface AppConfig {
    host: string
    port: number
    accessToken: string
}

export class App {
    public dev_mode: boolean = process.env.NODE_ENV === 'development'
    public logger: Logger
    public napcat: NCWebsocket
    public db: Database.Database
    public auth: Auth
    public quick: Quick

    private agents: Map<string, Agent>
    private watcher: FSWatcher

    constructor(config: AppConfig) {
        this.logger = new Logger({
            level: this.dev_mode ? 'debug' : 'info',
            format: format.json(),
            transports: [
                new transports.File({ filename: 'error.log', level: 'error' }),
                new transports.File({ filename: 'combined.log' })
            ]
        })
        if (this.dev_mode) {
            this.logger.add(new transports.Console({
                format: format.simple()
            }))
        }

        this.napcat = new NCWebsocket({
            protocol: 'ws',
            host: config.host,
            port: config.port,
            accessToken: config.accessToken,
            throwPromise: true,
            reconnection: {
              enable: true,
              attempts: 10,
              delay: 5000
            }
        }, this.dev_mode)

        
        this.db = new Database('data.db', {
            verbose: this.logger.verbose
        })
        this.db.pragma('journal_mode = WAL')
        this.db.pragma('foreign_keys = ON')


        this.auth = new Auth(this.db, this.logger.child({ name: 'Auth' }))


        this.quick = new Quick(this)


        this.agents = new Map()
        this.watchAgents()

    }
    
    async start() {
        this.logger.log('info', `Connecting...`)
        try {
            await this.napcat.connect()
        } catch (error) {
            this.logger.log('error', 'Failed to connect:', error)
            process.exit(1)
        }
    }

    watchAgents() {
        const AGENT_DIR = './agents'
        this.watcher = chokidar.watch(AGENT_DIR, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        })

        this.watcher.on('add', async (path) => {
            const filename = path.split(/[\\/]/).pop()
            if (filename && filename.endsWith('.ts')) {
                if (this.agents.has(filename)) {
                    await this.agents.get(filename)!.reload()
                } else {
                    const agent = new Agent(this, AGENT_DIR, filename)
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
