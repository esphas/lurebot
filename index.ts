import dotenv from 'dotenv'
import { App } from './app'

dotenv.config({
    path: '.env',
    quiet: process.env.NODE_ENV !== 'development',
})

async function main() {
    const host = process.env.NAPCAT_HOST
    const port = Number(process.env.NAPCAT_PORT)
    const accessToken = process.env.NAPCAT_ACCESS_TOKEN ?? ''

    const llm_endpoint = process.env.LLM_ENDPOINT
    const llm_api_key = process.env.LLM_API_KEY

    if (!host || !port) {
        throw new Error('NAPCAT_HOST and NAPCAT_PORT must be set')
    }

    const app = new App({
        host,
        port,
        accessToken,
        llm_endpoint,
        llm_api_key,
    })

    await app.start()
}

main()
