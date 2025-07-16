import { EventKey, EventHandleMap, Structs } from "node-napcat-ts";
import { App } from "../app";

export async function register(app: App, on: (event: EventKey, fn: EventHandleMap[EventKey]) => void) {
    const auth = app.auth

    const reply = async (context, text: string) => {
        await app.napcat.send_msg({
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
            await reply(context, String(result))
        } else {
            const mDice = context.raw_message.match(/^\.r(?:oll)?\s*((?:(?:\d+\s*)?d\s*)?\d+)((?:\s*[+-]\s*(?:(?:\d+\s*)?d\s*)?\d+)*)\s*$/)
            if (mDice && auth.isUser(context.user_id)) {
                const first = mDice[1]
                const rest = mDice[2].trim()
                let sum = 0
                let result = ''
                if (first.includes('d')) {
                    const [count, face] = first.split('d')
                    const diceResult = rollDice(Number(count) || 1, Number(face))
                    sum += diceResult
                    result += `${Number(count) || 1}d${Number(face)}(${diceResult})`
                } else {
                    const diceResult = rollDice(1, Number(first))
                    sum += diceResult
                    result += `1d${Number(first)}(${diceResult})`
                }
                console.log(rest)
                for (const dice of rest.matchAll(/([+-])\s*(?:(\d+\s*)?(d)\s*)?(\d+)/g)) {
                    const sign = dice[1] === '+' ? 1 : -1
                    const count = Number(dice[2]) || 1
                    const d = dice[3]
                    const face = Number(dice[4])
                    if (d === 'd') {
                        const diceResult = rollDice(count, face)
                        sum += sign * diceResult
                        result += `${dice[1]}${count}d${face}(${diceResult})`
                    } else {
                        const diceResult = face
                        sum += sign * diceResult
                        result += `${dice[1]}${face}(${diceResult})`
                    }
                }
                result += ` = ${sum}`
                await reply(context, result)
            }
        }
    })
}
