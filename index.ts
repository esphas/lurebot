import dotenv from 'dotenv'
import { NCWebsocket } from 'node-napcat-ts'
import Database from 'better-sqlite3'
import { register } from './register'
import { App } from './app'
import { Auth } from './auth'


dotenv.config()

async function main() {
    const debug = process.env.DEBUG === 'true'

    const host = process.env.NAPCAT_HOST
    const port = Number(process.env.NAPCAT_PORT)
    const accessToken = process.env.NAPCAT_ACCESS_TOKEN ?? ''


    const db = new Database('data.db', {
        verbose: debug ? console.log : undefined
    })
    db.pragma('journal_mode = WAL')

    
    if (!host || !port) {
        throw new Error('NAPCAT_HOST and NAPCAT_PORT must be set')
    }
    const napcat = new NCWebsocket({
        protocol: 'ws',
        host,
        port,
        accessToken,
        throwPromise: true,
        reconnection: {
          enable: true,
          attempts: 10,
          delay: 5000
        }
    }, debug);


    const app: App = { db, napcat, auth: new Auth(db) }


    register(app)


    console.log(`Connecting...`)
    try {
        await napcat.connect()
    } catch (error) {
        console.error('Failed to connect:', error)
        process.exit(1)
    }
}

main()
