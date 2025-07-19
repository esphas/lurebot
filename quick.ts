import { SendMessageSegment, Structs } from 'node-napcat-ts'
import { App } from './app'

export class Quick {
    constructor(private app: App) {}

    async wait_random(min: number, max: number) {
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min))
    }

    async log_error(context: {
        user_id: number
        group_id?: number
        sender: {
            user_id: number
            nickname: string
        }
        raw_message: string
    }, text: string) {
        const { auth, napcat: ncat } = this.app
        const { scope } = auth.from_napcat(context)
        const listeners = auth.get_error_notify_users(scope.id)
        for (const listener of listeners) {
            await ncat.send_forward_msg({
                user_id: Number(listener),
                message: [{
                    type: 'node',
                    data: {
                        user_id: String(context.sender.user_id),
                        nickname: context.sender.nickname,
                        content: [
                            Structs.text(context.raw_message),
                        ]
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

    async reply(context: { user_id: number, group_id?: number, message_id: number }, text: string) {
        await this.app.napcat.send_msg({
            user_id: context.user_id,
            group_id: context.group_id,
            message: [
                Structs.reply(context.message_id),
                Structs.text(text)
            ]
        })
    }
}
