import { WSSendReturn } from 'node-napcat-ts'
import ms from 'ms'

import { LLMMessage } from '../llm'
import { Command } from '../agent/command'

export const commands = [
    {
        managed: false,
        event: 'message.group',
        permission: 'chat',
        name: 'summary(?:-(\\d+))?(?:\\[(.+)\\])?',
        pattern: '((?:.|\n)+)?',
        handler: async (context, match, app) => {
            const llm = context.llm
            const count = Math.min(match![2] ? parseInt(match![2]) : 300, 500)
            const model = match![3] || context.llm.default_model
            const question = match![4]

            try {
                const start_time = Date.now()
                await context.reply(
                    `好的，让我查看一下最近的聊天记录... (${model})`,
                )

                const history = format_history(
                    (
                        await app!.napcat.get_group_msg_history({
                            group_id: context.group!.id,
                            message_seq: 0,
                            count,
                        })
                    ).messages,
                )

                const messages = [
                    {
                        role: 'system',
                        content: [
                            `你是一个专业的聊天助手，正处在一个群聊中。`,
                            `你的 QQ 号为 ${context.self.qq}。`,
                            `你需要根据聊天记录，提炼主要话题和关键信息，以便回答用户的问题。`,
                            `格式上，你需要按照内容前后的顺序，按话题划分小标题。`,
                            `内容上，你需要注意区分历史发言事实和你产生的主观评论。如果需要用到链接，必须原样保留。`,
                            `以下是聊天记录：`,
                        ].join(''),
                    },
                    {
                        role: 'system',
                        content: history,
                    },
                    {
                        role: 'user',
                        content: question || '最近在聊些什么？',
                    },
                ] as LLMMessage[]

                const response = await llm.chat_completions(messages, model)

                const end_time = Date.now()
                const duration = ms(end_time - start_time)

                const content = response.content
                await context.reply(`[${duration}] ${content}`)
            } catch (error) {
                await context.reply('LLM 请求失败')
                await context.notify(
                    `LLM 请求失败: ${error instanceof Error ? error.message : JSON.stringify(error, null, 2)}`,
                )
            }
        },
    } as Command<'message.group'>,
] as Command[]

function format_history(messages: WSSendReturn['get_msg'][]) {
    return messages
        .map((message, index) => {
            const meta = `#${index + 1} 消息${message.message_id}：${message.sender.nickname}(${message.sender.user_id}) ${new Date(message.time.toLocaleString())}`
            const content = message.message
                .map((m) => format_message(m))
                .join('')
            return `${meta}\n${content}`
        })
        .join('\n\n')
}

function format_message(message: WSSendReturn['get_msg']['message'][number]) {
    switch (message.type) {
        case 'text':
            return message.data.text
        case 'at':
            return `@${message.data.qq} `
        case 'poke':
            return `戳一戳 ${message.data.id}`
        case 'image':
            return `[图片]`
        case 'file':
            return `[文件=${message.data.file}]`
        case 'dice':
            return `[骰子=${message.data.result}]`
        case 'rps':
            return `[猜拳=${message.data.result}]`
        case 'face':
            return `[表情=${message.data.id}]`
        case 'reply':
            return `[回复=${message.data.id}]`
        case 'video':
            return `[视频=${message.data.file}]`
        case 'record':
            return `[语音=${message.data.file}]`
        case 'forward':
            return `[转发=${message.data.id}]`
        case 'json':
            return `[JSON=${message.data.data}]`
        case 'markdown':
            return `[Markdown=${message.data.content}]`
        default:
            return '[未知消息]'
    }
}
