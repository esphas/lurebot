import { Logger } from 'winston'

import { Database } from './db'
import { AuthScope } from './auth'

export type SessionIdentifier = {
    topic: string,
    user_id: string,
    scope_id: AuthScope,
    scope_info?: string,
}

export type SessionOptions = Partial<{
    ttl: number,
}>

export type Session = {
    id: string,
    created_at: Date,
    last_active: Date,
    topic: string,
    created_by: string,
    scope_id: AuthScope,
    scope_info: string,
} & Required<SessionOptions>

export const PARTICIPANT_ROLES = ['owner', 'moderator', 'member'] as const
export type ParticipantRole = typeof PARTICIPANT_ROLES[number]

export interface Participant {
    session_id: string
    user_id: string
    role: ParticipantRole
    joined_at: Date
    last_active: Date
}

export enum MessageRole {
    User = 'user',
    Bot = 'bot'
}

export interface Message {
    session_id: string
    role: MessageRole
    user_id?: string
    id?: string
    content: string
    timestamp: Date
}

export interface UserSession {
    user_id: string
    session_id: string
    last_read_at: Date
    is_active: boolean
}

export const FAILURE_REASONS = [
    'session_already_exists',
    'session_not_found',
    'session_not_belong_to_user',
] as const
export type FailureReason = typeof FAILURE_REASONS[number]

export type Optional<T> = {
    ok: true,
    data: T,
} | {
    ok: false,
    reason: FailureReason,
}

export class Sessions {
    constructor(private db: Database, private logger: Logger) {
    }

    private generate_session_id(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }

    create_session(identifier: SessionIdentifier, options: SessionOptions): Optional<Session> {
        const existing_session = this.find_participant_session(identifier)
        if (existing_session) {
            return {
                ok: false,
                reason: 'session_already_exists',
            }
        }

        const session_id = this.generate_session_id()
        const session: Session = {
            id: session_id,
            created_at: new Date(),
            last_active: new Date(),

            topic: identifier.topic,
            created_by: identifier.user_id,
            scope_id: identifier.scope_id,
            scope_info: identifier.scope_info ?? '',

            // defaults
            ttl: 0,
            ...options,
        }

        this.db.transaction(() => {
            this.db.insert('sessions', {
                id: session_id,
                last_active: session.last_active.toISOString(),
                created_at: session.created_at.toISOString(),
                topic: session.topic,
                created_by: session.created_by,
                scope_id: session.scope_id,
                scope_info: session.scope_info,
                ttl: session.ttl
            })

            this.db.insert('session_participants', {
                session_id,
                user_id: session.created_by,
                joined_at: session.created_at.toISOString(),
                role: 'owner',
            })
        })

        return {
            ok: true,
            data: session,
        }
    }

    private from_db_session(session: any): Session {
        return {
            id: session.id,
            created_at: new Date(session.created_at),
            last_active: new Date(session.last_active),
            topic: session.topic,
            created_by: session.created_by,
            scope_id: session.scope_id,
            scope_info: session.scope_info,
            ttl: session.ttl
        }
    }

    get_session(session_id: string, validate: boolean = true): Session | null {
        let session: Session | null = null
        this.db.transaction(() => {
            const db_session = this.db.get('sessions', { id: session_id }) as any
            if (!db_session) return null
            session = this.from_db_session(db_session)
            if (!session) return

            if (!validate) return

            if (session.ttl > 0) {
                const now = new Date()
                const last_active = new Date(session.last_active)
                if (now.getTime() - last_active.getTime() > session.ttl) {
                    this.delete_session(session_id)
                    session = null
                    return
                }
            }
        })
        return session
    }

    delete_session(session_id: string): boolean {
        return this.db.delete('sessions', { id: session_id }).changes > 0
    }

    get_participant_sessions(user_id: string, validate: boolean = true): Session[] {
        const sps = this.db.all('session_participants', { user_id }) as any[]
        const sessions = sps.map((sp: any) => this.get_session(sp.session_id, validate))
        return sessions.filter((session): session is Session => session !== null)
    }

    find_participant_session(identifier: SessionIdentifier): Session | null {
        const sessions = this.get_participant_sessions(identifier.user_id)

        const topic = identifier.topic
        const scope_id = identifier.scope_id
        const scope_info = identifier.scope_info ?? ''

        return sessions.find((session) => 
            session.topic === topic &&
            session.scope_id === scope_id &&
            session.scope_info === scope_info
        ) ?? null
    }

    get_or_create_session(identifier: SessionIdentifier, options: SessionOptions): Optional<Session> {
        const existing_session = this.find_participant_session(identifier)
        if (existing_session) {
            return {
                ok: true,
                data: existing_session,
            }
        }
        return this.create_session(identifier, options)
    }

    get_session_variable(session_id: string, key: string) {
        const variable = this.db.get('session_variables', { session_id, key })?.value as string ?? null
        if (!variable) {
            return null
        }
        try {
            return JSON.parse(variable)
        } catch (error) {
            return variable
        }
    }

    set_session_variable(session_id: string, key: string, value: any) {
        const variable = JSON.stringify(value)
        if (this.db.has('session_variables', { session_id, key })) {
            this.db.update('session_variables', { session_id, key }, { value: variable, updated_at: new Date().toISOString() })
        } else {
            this.db.insert('session_variables', {
                session_id,
                key,
                value: variable,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
        }
    }
}
