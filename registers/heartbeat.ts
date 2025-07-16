import { EventKey, EventHandleMap } from "node-napcat-ts";
import { App } from "../app";

export async function register(app: App, on: (event: EventKey, fn: EventHandleMap[EventKey]) => void) {
    const auth = app.auth
    const ncat = app.napcat

    on('notice.notify.poke', async (context) => {
        if (context.target_id === context.self_id && auth.isUser(context.user_id)) {
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 790) + 10))
            ncat.send_poke({
                user_id: context.user_id,
                group_id: context.group_id
            })
        }
    })
}
