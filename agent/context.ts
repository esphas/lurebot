import { Logger } from 'winston'
import {
    AllHandlers,
    EventKey,
    MessageHandler,
    NoticeHandler,
    Receive,
    SendMessageSegment,
    Structs,
} from 'node-napcat-ts'
import cleanStack from 'clean-stack'

import { App } from '../app'
import { auth_t, SafeCalls } from '../auth'
import { User } from '../auth/user'
import { Group } from '../auth/group'
import { Scope } from '../auth/scope'
import { Sessions } from '../session'
import { LLM } from '../llm'

export interface CommonContext<T extends EventKey> {
    raw: AllHandlers[T]
    self: User
    user: User
    group: Group | null
    scope: Scope
    time: Date
    logger: Logger
    auth: <T extends keyof SafeCalls>(t: T) => SafeCalls[T]
    sessions: Sessions
    llm: LLM
    notify(error: Error | string): Promise<void>
    reply: (
        message: string | Buffer | SendMessageSegment | SendMessageSegment[],
    ) => Promise<{ message_id: number }>
    reply_poke: () => Promise<null>
}

export interface MessageContext<T extends EventKey> extends CommonContext<T> {
    message: Receive[keyof Receive][]
}

export type NoticeContext<T extends EventKey> = CommonContext<T>

export type Context<T extends EventKey> = MessageContext<T> | NoticeContext<T>

export interface CreateContextExtra {
    app: App
    logger: Logger
}
export function create_context_napcat<T extends keyof MessageHandler>(
    napcat_ctx: MessageHandler[T],
    extra: CreateContextExtra,
): MessageContext<T>
export function create_context_napcat<T extends keyof NoticeHandler>(
    napcat_ctx: NoticeHandler[T],
    extra: CreateContextExtra,
): NoticeContext<T> | null
export function create_context_napcat<T extends keyof AllHandlers>(
    napcat_ctx: AllHandlers[T],
    extra: CreateContextExtra,
): Context<T> | null
export function create_context_napcat<T extends keyof AllHandlers>(
    napcat_ctx: AllHandlers[T],
    extra: CreateContextExtra,
): Context<T> | null {
    if (!('self_id' in napcat_ctx) || !('user_id' in napcat_ctx)) {
        return null
    }
    const app = extra.app
    const logger = extra.logger
    const self = app.auth.user.from_napcat({ user_id: napcat_ctx.self_id })
    const { user, group, scope } = app.auth.from_napcat(napcat_ctx)
    // for convenience
    const merged_target =
        'group_id' in napcat_ctx
            ? {
                  user_id: napcat_ctx.user_id,
                  group_id: napcat_ctx.group_id,
              }
            : {
                  user_id: napcat_ctx.user_id,
              }
    const [permissions, safe_calls] = app.auth.get_safe_calls(user.id, scope.id)
    const auth = <T extends keyof SafeCalls>(t: T) => {
        if (!permissions.includes(t)) {
            throw new Error(
                `User ${user.id} is not allowed to use auth(${t}) in scope ${scope.id}`,
            )
        }
        return auth_t<T>(safe_calls)
    }
    const common: CommonContext<T> = {
        raw: napcat_ctx,
        self,
        user,
        group,
        scope,
        time: new Date(napcat_ctx.time),
        auth,
        sessions: app.sessions,
        llm: app.llm,
        logger,
        notify: async (error) => {
            const listeners = app.auth.get_error_notify_users(scope.id)
            if (listeners.length === 0) {
                return
            }
            // TOOD: 优化报错展示
            const message: SendMessageSegment[] = []
            if (error instanceof Error) {
                message.push(
                    Structs.text(
                        `${error.name}: ${error.message}\n${cleanStack(error.stack)}`,
                    ),
                )
            } else {
                message.push(Structs.text(`${error}`))
            }
            for (const listener of listeners) {
                if (listener.qq != null) {
                    await app.napcat.send_msg({
                        user_id: listener.qq,
                        message,
                    })
                }
            }
        },
        reply: async (msg) => {
            const message: SendMessageSegment[] = []
            if ('message_id' in napcat_ctx) {
                message.push(Structs.reply(napcat_ctx.message_id))
            }
            if (typeof msg === 'string') {
                message.push(Structs.text(msg))
            } else if (msg instanceof Buffer) {
                message.push(Structs.image(msg))
            } else if (Array.isArray(msg)) {
                message.push(...msg)
            } else {
                message.push(msg as SendMessageSegment)
            }
            return await app.napcat.send_msg({
                ...merged_target,
                message,
            })
        },
        reply_poke: async () => {
            return await app.napcat.send_poke(merged_target)
        },
    }
    if (napcat_ctx.post_type === 'message') {
        return {
            ...common,
            message: napcat_ctx.message,
        } as MessageContext<T>
    } else {
        return {
            ...common,
        } as NoticeContext<T>
    }
}
