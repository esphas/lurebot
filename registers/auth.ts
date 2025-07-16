import { EventKey, EventHandleMap, Structs } from "node-napcat-ts";
import { App } from "../app";

export async function register(app: App, on: <T extends EventKey>(event: T, fn: EventHandleMap[T]) => void) {
    const auth = app.auth

    const reply = (context, text: string) => {
        app.napcat.send_msg({
            user_id: context.user_id,
            group_id: context.group_id,
            message: [
                Structs.reply(context.message_id),
                Structs.text(text)
            ]
        })
    }

    // claim admin
    if (auth.userCount() === 0) {
        on('message.private', async (context) => {
            if (context.raw_message === '!admin') {
                if (auth.userCount() === 0) {
                    auth.createAdmin(context.user_id)
                    reply(context, 'You are now admin')
                }
            }
        })
    }

    on('message', async (context) => {
        // admin can add/remove group
        const mModGroup = context.raw_message.match(/^!group\s*(add|allow|remove|deny)\s*([^\s]+)\s*$/)
        if (mModGroup && auth.isAdmin(context.user_id)) {
            const action = mModGroup[1]
            const group_id = mModGroup[2]
            if (action === 'add' || action === 'allow') {
                auth.allowGroup(group_id)
                reply(context, `Group ${group_id} added`)
            } else {
                auth.denyGroup(group_id)
                reply(context, `Group ${group_id} removed`)
            }
        }
    })

    on('message.group', async (context) => {
        if (context.raw_message === '!register' && auth.isGroupAllowed(context.group_id)) {
            if (!auth.isUser(context.user_id)) {
                auth.createUser(context.user_id)
                reply(context, '√')
            } else {
                reply(context, '？')
            }
        }
    })
}
