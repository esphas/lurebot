import { Structs } from 'node-napcat-ts'
import { App } from './app'

export class Quick {
    constructor(private app: App) {}

    async wait_random(min: number, max: number) {
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min))
    }

    async log_error(context, text: string) {
        const { auth, napcat: ncat } = this.app
        const listeners = auth.get_error_report_listeners(context.group_id)
        for (const listener of listeners) {
            await ncat.send_forward_msg({
                user_id: Number(listener),
                message: [{
                    type: 'node',
                    data: {
                        user_id: context.sender.user_id,
                        nickname: context.sender.nickname,
                        content: context.message
                    }
                }]
            })
            await ncat.send_msg({
                user_id: Number(listener),
                message: [
                    Structs.text(text)
                ]
            })
        }
    }

    async reply(context, text: string) {
        await this.app.napcat.send_msg({
            user_id: context.user_id,
            group_id: context.group_id,
            message: [
                Structs.reply(context.message_id),
                Structs.text(text)
            ]
        })
    }

    async replyStatus(context, result: boolean) {
        await this.reply(context, result ? '√' : '×')
    }

    async replyOk(context) {
        await this.replyStatus(context, true)
    }

    async replyError(context) {
        await this.replyStatus(context, false)
    }
}
