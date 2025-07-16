import { EventKey, EventHandleMap, Structs } from "node-napcat-ts";
import { App } from "../app";

export async function register(app: App, on: (event: EventKey, fn: EventHandleMap[EventKey]) => void) {
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
    
    const rollDice = (count: number, face: number) => {
        const results: number[] = []
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * face) + 1)
        }
        return results.reduce((a, b) => a + b, 0)
    }

    on('message', async (context) => {
        const mSimpleDice = context.raw_message.match(/^\.r(?:oll)?\s*(\d+)\s*$/)
        if (mSimpleDice && auth.isUser(context.user_id)) {
            const face = Number(mSimpleDice[1])
            const result = rollDice(1, face)
            reply(context, String(result))
        } else {
            const mDice = context.raw_message.match(/^\.r(?:oll)?\s*((?:(?:\d+\s*)?d\s*)?\d+)((?:\s*[+-]\s*(?:(?:\d+\s*)?d\s*)?\d+)*)\s*$/)
            if (mDice && auth.isUser(context.user_id)) {
                const first = mDice[1]
                const rest = mDice[2].trim()
                let sum = 0
                if (first.includes('d')) {
                    const [count, face] = first.split('d')
                    sum += rollDice(Number(count) || 1, Number(face))
                } else {
                    sum += rollDice(1, Number(first))
                }
                for (const dice of rest.matchAll(/([+-])(?:(\d+\s*)?(d)\s*)?(\d+)/g)) {
                    const sign = dice[1] === '+' ? 1 : -1
                    const count = Number(dice[2]) || 1
                    const d = dice[3]
                    const face = Number(dice[4])
                    if (d === 'd') {
                        sum += sign * rollDice(count, face)
                    } else {
                        sum += sign * face
                    }
                }
                reply(context, String(sum))
            }
        }
    })
    
}
