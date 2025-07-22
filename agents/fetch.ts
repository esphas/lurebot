import { Structs } from 'node-napcat-ts'
import { Command } from '../agent/command'

export const commands = [
    {
        event: 'message',
        permission: 'fetch',
        name: 'fetch',
        pattern: '(.+)',
        handler: async (context, match) => {
            const url = match![2].trim()
            let response: Response
            try {
                response = await fetch(url)
            } catch (error) {
                await context.reply(
                    `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
                )
                return
            }
            if (!response.ok) {
                await context.reply(
                    `请求失败: ${response.status} ${response.statusText}\n${url}`,
                )
                return
            }
            const content_type = response.headers.get('content-type') || ''
            if (content_type.includes('application/json')) {
                try {
                    const data = await response.json()
                    await context.reply(JSON.stringify(data, null, 2))
                } catch (error) {
                    await context.reply(
                        `JSON解析失败: ${error instanceof Error ? error.message : String(error)}`,
                    )
                }
            } else if (content_type.includes('text')) {
                try {
                    const text = await response.text()
                    await context.reply(text)
                } catch (error) {
                    await context.reply(
                        `文本解析失败: ${error instanceof Error ? error.message : String(error)}`,
                    )
                }
            } else if (content_type.includes('image')) {
                const buffer = Buffer.from(await response.arrayBuffer())
                await context.reply(Structs.image(buffer))
            } else {
                await context.reply(`不支持的类型: ${content_type}`)
            }
        },
    } as Command<'message'>,
] as Command[]
