import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, napcat, quick, sessions } = agent.app

    agent.on('message', async (context) => {
        const match = context.raw_message.match(/^.(hangmanend|hangman|猜词|结束猜词)\s*(.*)$/)
        if (!match) { return }
        const { user, group, scope } = auth.from_napcat(context)
        if (!auth.can(user.id, scope.id, 'chat')) { return }

        const endgame = match[1].trim() === 'hangmanend' || match[1].trim() === '结束猜词'
        const guess_word = match[2].trim()

        if (endgame) {
            const session = sessions.find_participant_session({
                topic: 'hangman',
                user_id: user.id,
                scope_id: scope.id
            })
            if (session) {
                sessions.delete_session(session.id)
                await quick.reply(context, `猜词游戏结束！`)
                return
            } else {
                await quick.reply(context, `没有在猜词游戏中。`)
                return
            }
        }

        const session = await sessions.get_or_create_session({
            topic: 'hangman',
            user_id: user.id,
            scope_id: scope.id
        }, {
            ttl: 10 * 60 * 1000 // 10min
        })

        if (!session.ok) {
            await quick.reply(context, `出现异常: ${session.reason}`)
            return
        }

        const session_id = session.data.id
        
        const word_api = 'https://random-words-api.vercel.app/word'
        const max_attempts = 10

        const game = sessions.get_variable<GameState>(session_id, 'game')
        if (game == null) {
            let word = ''// await fetch(word_api).then(res => res.json()).then(words => words[0]).catch(() => null)
            if (!word) {
                word = 'error'
            }
            sessions.set_variable(session_id, 'game', {
                state: 'playing',
                word,
                revealed: word.split('').map(() => '_').join(''),
                attempts: 0,
                wrong_guesses: []
            })
            await quick.reply(context, `猜词游戏开始！\n你还有 ${max_attempts} 次机会。`)
        } else {
            if (!guess_word) {
                await quick.reply(context, `正在猜词游戏中，你还有 ${max_attempts - game.attempts} 次机会。`)
                return
            }

            const word_letters = game.word.split('')
            const guess_letters = guess_word.split('')
            game.revealed = game.revealed.split('').map((letter, index) => {
                if (word_letters[index] === guess_letters[index]) { return word_letters[index] }
                return letter
            }).join('')
            game.attempts++

            const guessed = game.wrong_guesses.length > 0 ? `你猜过 ${game.wrong_guesses.join(', ')}。` : ''

            if (game.revealed === game.word) {
                await quick.reply(context, `你赢了！正确答案是 ${game.word}。${guessed}`)
                sessions.delete_session(session_id)
                return
            }

            if (game.attempts >= max_attempts) {
                await quick.reply(context, `你输了！正确答案是 ${game.word}。${guessed}`)
                sessions.delete_session(session_id)
                return
            }

            game.wrong_guesses.push(guess_word)
            sessions.set_variable(session_id, 'game', game)

            await quick.reply(context, `${game.revealed}\n\n你还有 ${max_attempts - game.attempts} 次机会。${guessed}`)
        }
    })
}

type GameState = {
    state: 'new' | 'playing',
    word: string,
    revealed: string,
    attempts: number,
    wrong_guesses: string[]
}
