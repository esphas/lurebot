import { Agent } from '../agent'

export default async (agent: Agent) => {
    const auth = agent.app.auth
    const quick = agent.app.quick
    
    const rollDice = (count: number, face: number) => {
        const results: number[] = []
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * face) + 1)
        }
        return results.reduce((a, b) => a + b, 0)
    }

    agent.on('message', async (context) => {
        const mSimpleDice = context.raw_message.match(/^\.r(?:oll)?\s*(\d+)\s*$/)
        if (mSimpleDice && auth.isRegisteredUser(context.user_id)) {
            const face = Number(mSimpleDice[1])
            const result = rollDice(1, face)
            await quick.reply(context, String(result))
        } else {
            const mDice = context.raw_message.match(/^\.r(?:oll)?\s*((?:(?:\d+\s*)?d\s*)?\d+)((?:\s*[+-]\s*(?:(?:\d+\s*)?d\s*)?\d+)*)\s*$/)
            if (mDice && auth.isRegisteredUser(context.user_id)) {
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
                agent.app.logger.log('debug', result)
                await quick.reply(context, result)
            }
        }
    })
}
