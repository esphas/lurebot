import { Agent } from '../agent'

export default async (agent: Agent) => {
    const { auth, napcat: ncat, quick, sessions } = agent.app

    agent.on('message', async (context) => {
        if (!auth.can(context, 'chat')) {
            return
        }
        const mHangman = context.raw_message.match(/^.(hangman|猜词|hangmanend|结束猜词)\s*(.*)$/)
        if (!mHangman) {
            return
        }

        const user_id = String(context.user_id)
        const scope_id = 'group_id' in context ? 'group' : 'private'
        const scope_info = 'group_id' in context ? String(context.group_id) : ''

        const endgame = mHangman[1].trim() === 'hangmanend' || mHangman[1].trim() === '结束猜词'
        const guess_word = mHangman[2].trim()

        if (endgame) {
            const session = await sessions.find_participant_session({
                topic: 'hangman',
                user_id,
                scope_id,
                scope_info
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
            user_id,
            scope_id,
            scope_info
        }, {
            ttl: 10 * 60 * 1000 // 10min
        })

        if (!session.ok) {
            await quick.reply(context, `出现异常: ${session.reason}`)
            return
        }

        const session_id = session.data.id
        const get = (key: string) => sessions.get_session_variable(session_id, key)
        const set = (key: string, value: any) => sessions.set_session_variable(session_id, key, value)
        
        const word_api = 'https://random-word-api.herokuapp.com/word'
        const max_attempts = 6

        let state = get('state') ?? 'new'
        if (state === 'new') {
            const word = await fetch(word_api).then(res => res.json()).then(words => words[0])
            set('game', {
                state: 'playing',
                word,
                revealed: word.split('').map(() => '_').join(''),
                attempts: 0,
                wrong_guesses: []
            })
            await quick.reply(context, `猜词游戏开始！\n你还有 ${max_attempts} 次机会。`)
        } else if (state === 'playing') {
            const game = get('game') as GameState

            if (!guess_word) {
                await quick.reply(context, `正在猜词游戏中，你还有 ${max_attempts - game.attempts} 次机会。`)
                return
            }

            const word_letters = game.word.split('')
            const guess_letters = guess_word.split('')
            const correct_letters = word_letters.filter((letter, index) => letter === guess_letters[index])
            game.revealed = game.revealed.split('').map((letter, index) => {
                if (correct_letters.includes(word_letters[index])) {
                    return word_letters[index]
                }
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
            set('game', game)

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
