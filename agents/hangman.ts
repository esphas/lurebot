import { Command } from '../agent/command'

type GameState = {
    state: 'new' | 'playing'
    word: string
    revealed: string
    attempts: number
    wrong_guesses: string[]
}

export const commands = [
    {
        event: 'message',
        permission: 'chat',
        name: 'hangmanend|hangman|猜词|结束猜词',
        pattern: '(.+)?',
        handler: async (context, match) => {
            const endgame =
                match![1].trim() === 'hangmanend' ||
                match![1].trim() === '结束猜词'
            const guess_word = match![2].trim()
            const sessions = context.sessions

            if (endgame) {
                const session = sessions.find_participant_session({
                    topic: 'hangman',
                    user_id: context.user.id,
                    scope_id: context.scope.id,
                })
                if (session) {
                    sessions.delete_session(session.id)
                    await context.reply(`猜词游戏结束！`)
                    return
                } else {
                    await context.reply(`没有在猜词游戏中。`)
                    return
                }
            }

            const session = sessions.get_or_create_session(
                {
                    topic: 'hangman',
                    user_id: context.user.id,
                    scope_id: context.scope.id,
                },
                {
                    ttl: 10 * 60 * 1000, // 10min
                },
            )

            if (!session.ok) {
                await context.reply(`出现异常: ${session.reason}`)
                return
            }

            const session_id = session.data.id

            // const word_api = 'https://random-words-api.vercel.app/word'
            const max_attempts = 10

            const game = sessions.get_variable<GameState>(session_id, 'game')
            if (game == null) {
                let word = '' // await fetch(word_api).then(res => res.json()).then(words => words[0]).catch(() => null)
                if (!word) {
                    word = 'error'
                }
                sessions.set_variable(session_id, 'game', {
                    state: 'playing',
                    word,
                    revealed: word
                        .split('')
                        .map(() => '_')
                        .join(''),
                    attempts: 0,
                    wrong_guesses: [],
                })
                await context.reply(
                    `猜词游戏开始！\n你还有 ${max_attempts} 次机会。`,
                )
            } else {
                if (!guess_word) {
                    await context.reply(
                        `正在猜词游戏中，你还有 ${max_attempts - game.attempts} 次机会。`,
                    )
                    return
                }

                const word_letters = game.word.split('')
                const guess_letters = guess_word.split('')
                game.revealed = game.revealed
                    .split('')
                    .map((letter, index) => {
                        if (word_letters[index] === guess_letters[index]) {
                            return word_letters[index]
                        }
                        return letter
                    })
                    .join('')
                game.attempts++

                const guessed =
                    game.wrong_guesses.length > 0
                        ? `你猜过 ${game.wrong_guesses.join(', ')}。`
                        : ''

                if (game.revealed === game.word) {
                    await context.reply(
                        `你赢了！正确答案是 ${game.word}。${guessed}`,
                    )
                    sessions.delete_session(session_id)
                    return
                }

                if (game.attempts >= max_attempts) {
                    await context.reply(
                        `你输了！正确答案是 ${game.word}。${guessed}`,
                    )
                    sessions.delete_session(session_id)
                    return
                }

                game.wrong_guesses.push(guess_word)
                sessions.set_variable(session_id, 'game', game)

                await context.reply(
                    `${game.revealed}\n\n你还有 ${max_attempts - game.attempts} 次机会。${guessed}`,
                )
            }
        },
    } as Command<'message'>,
] as Command[]
