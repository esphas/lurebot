import { Logger } from 'winston'

import { Database } from './db'
import { AuthScope } from './auth'

export type SessionIdentifier = {
    topic: string,
    user_id: string,
    scope: AuthScope,
    group_id?: string,
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
    scope: AuthScope,
    group_id?: string,
} & Required<SessionOptions>

export enum ParticipantRole {
    Owner = 'owner',
    Admin = 'admin',
    Member = 'member'
}

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

export enum FailureReason {
    SessionAlreadyExists = 'session_already_exists',
    SessionNotFound = 'session_not_found',
    SessionNotBelongToUser = 'session_not_belong_to_user',
}

export class Sessions {
    constructor(private db: Database, private logger: Logger) {
    }

    private generate_session_id(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }

    async create_session(identifier: SessionIdentifier, options: SessionOptions): Promise<Session | FailureReason> {
        const existing_session = await this.find_participant_session(identifier)
        if (existing_session) {
            return FailureReason.SessionAlreadyExists
        }

        const session_id = this.generate_session_id()
        const session: Session = {
            id: session_id,
            created_at: new Date(),
            last_active: new Date(),

            topic: identifier.topic,
            created_by: identifier.user_id,
            scope: identifier.scope,
            group_id: 'group_id' in identifier ? identifier.group_id : '',

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
                group_id: session.group_id,
                scope: session.scope,
                ttl: session.ttl
            })

            this.db.insert('session_participants', {
                session_id,
                user_id: session.created_by,
                joined_at: session.created_at.toISOString(),
                role: ParticipantRole.Owner,
            })
        })

        return session
    }

    private from_db_session(session: any): Session {
        return {
            id: session.id,
            created_at: new Date(session.created_at),
            last_active: new Date(session.last_active),
            topic: session.topic,
            created_by: session.created_by,
            scope: session.scope,
            group_id: session.group_id,
            ttl: session.ttl
        }
    }

    async get_session(session_id: string, validate: boolean = true): Promise<Session | null> {
        let session: Session | null = null
        this.db.transaction(async () => {
            const db_session = this.db.get('sessions', { id: session_id }) as any
            if (!db_session) return null
            session = this.from_db_session(db_session)
            if (!session) return

            if (!validate) return

            if (session.ttl > 0) {
                const now = new Date()
                const last_active = new Date(session.last_active)
                if (now.getTime() - last_active.getTime() > session.ttl) {
                    await this.delete_session(session_id)
                    session = null
                    return
                }
            }
        })
        return session
    }

    async delete_session(session_id: string): Promise<boolean> {
        return this.db.delete('sessions', { id: session_id }).changes > 0
    }

    async get_participant_sessions(user_id: string, validate: boolean = true): Promise<Session[]> {
        const sps = this.db.all('session_participants', { user_id }) as any[]
        const sessions = await Promise.all(sps.map((sp: any) => this.get_session(sp.session_id, validate)))
        return sessions.filter((session): session is Session => session !== null)
    }

    async find_participant_session(identifier: SessionIdentifier): Promise<Session | null> {
        const sessions = await this.get_participant_sessions(identifier.user_id)

        const topic = identifier.topic
        const scope = identifier.scope
        const group_id = 'group_id' in identifier ? identifier.group_id : ''

        return sessions.find((session) => 
            session.topic === topic &&
            session.scope === scope &&
            session.group_id === group_id
        ) ?? null
    }
}
