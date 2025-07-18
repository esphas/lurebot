import { format, Logger, transports } from 'winston'
import { NCWebsocket } from 'node-napcat-ts'

import path from 'path'
import fs from 'fs'

import { Database } from './db'
import { Auth } from './auth'
import { Sessions } from './session'
import { Agents } from './agent'
import { Quick } from './quick'

export type RequiredAppConfig = {
    host: string
    port: number
    accessToken: string
}

export type OptionalAppConfig = Partial<{
    dev_mode: boolean
    protocol: 'ws' | 'wss'
    log_dir: string
    log_file_app: string
    db_path: string
    agent_dir: string
}>

export type AppConfig = RequiredAppConfig & OptionalAppConfig

export class App {
    public napcat: NCWebsocket
    public db: Database
    public auth: Auth
    public sessions: Sessions
    public quick: Quick
    
    private logger: Logger
    private agents: Agents

    private config: Required<AppConfig>

    private defaultOptionalAppConfig: Required<OptionalAppConfig> = {
        dev_mode: process.env.NODE_ENV === 'development',
        protocol: 'ws',
        log_dir: 'logs',
        log_file_app: 'app.log',
        db_path: 'data/app.db',
        agent_dir: 'agents',
    }

    constructor(cfg: AppConfig) {
        this.config = { ...this.defaultOptionalAppConfig, ...cfg }

        fs.mkdirSync(this.config.log_dir, { recursive: true })
        fs.mkdirSync(path.dirname(this.config.db_path), { recursive: true })

        const logger = new Logger({
            level: this.config.dev_mode ? 'debug' : 'info',
            format: format.json(),
            transports: [
                new transports.File({ filename: path.join(this.config.log_dir, this.config.log_file_app) })
            ]
        })
        if (this.config.dev_mode) {
            logger.add(new transports.Console({
                format: format.printf(({ level, message, name }) => {
                    return `[${name}][${level}] ${message}`
                })
            }))
        }

        this.logger = logger.child({ name: 'App' })

        this.napcat = new NCWebsocket({
            protocol: this.config.protocol,
            host: this.config.host,
            port: this.config.port,
            accessToken: this.config.accessToken,
            throwPromise: true,
            reconnection: {
              enable: true,
              attempts: 10,
              delay: 5000
            }
        }, this.config.dev_mode)

        this.db = new Database(this.config.db_path, logger.child({ name: 'Database' }))
        
        this.auth = new Auth(this.db, logger.child({ name: 'Auth' }))
        this.sessions = new Sessions(this.db, logger.child({ name: 'Session' }))

        this.quick = new Quick(this)

        this.agents = new Agents(this, this.config.agent_dir, logger.child({ name: 'Agents' }))
        this.agents.watch()
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
}
