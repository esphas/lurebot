import { Logger } from 'winston'
import { Database } from './db'

export type SessionType = 'private' | 'group'

export interface Session {
    id: string
    type: SessionType
    name?: string
    context: {
        messages: Message[]
        variables: Record<string, any>
        state: string
    }
    last_active: Date
    created_at: Date
    created_by: string
}

export interface SessionParticipant {
    session_id: string
    user_id: string
    joined_at: Date
    role: 'owner' | 'admin' | 'member'
    is_active: boolean
}

export interface Message {
    id?: string
    session_id: string
    from: 'user' | 'bot'
    user_id?: string
    content: string
    timestamp: Date
}

export interface UserSession {
    user_id: string
    session_id: string
    last_read_at: Date
    is_active: boolean
}

export class Sessions {
    constructor(private db: Database, private logger: Logger) {
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }

    async create_session(
        type: SessionType, 
        created_by: string, 
        name?: string, 
        participants?: string[]
    ): Promise<Session> {
        const session_id = this.generateSessionId()
        
        const new_session: Session = {
            id: session_id,
            type,
            name,
            context: {
                messages: [],
                variables: {},
                state: 'idle'
            },
            last_active: new Date(),
            created_at: new Date(),
            created_by
        }
        
        this.db.transaction(() => {
            this.db.insert('sessions', {
                id: session_id,
                type,
                name: name || null,
                context: JSON.stringify(new_session.context),
                last_active: new_session.last_active.toISOString(),
                created_at: new_session.created_at.toISOString(),
                created_by
            })
            
            this.db.insert('session_participants', {
                session_id,
                user_id: created_by,
                joined_at: new_session.created_at.toISOString(),
                role: 'owner',
                is_active: 1
            })
            
            if (participants) {
                for (const user_id of participants) {
                    if (user_id !== created_by) {
                        this.db.insert('session_participants', {
                            session_id,
                            user_id: user_id,
                            joined_at: new_session.created_at.toISOString(),
                            role: 'member',
                            is_active: 1
                        })
                    }
                }
            }
        })
        
        return new_session
    }

    async get_sessions(user_id: string): Promise<Session[]> {
        const participantSessions = this.db.all(
            'session_participants',
            { user_id: user_id, is_active: 1 }
        ) as any[]
        
        const sessionIds = participantSessions.map(p => p.session_id)
        if (sessionIds.length === 0) return []
        
        const sessions = this.db.all('sessions', { id: ['in', sessionIds] }) as any[]
        
        return sessions.map(session => ({
            id: session.id,
            type: session.type,
            name: session.name,
            context: JSON.parse(session.context),
            last_active: new Date(session.last_active),
            created_at: new Date(session.created_at),
            created_by: session.created_by
        }))
    }

    async get_session(session_id: string): Promise<Session | null> {
        const session = this.db.get('sessions', { id: session_id }) as any
        if (!session) return null
        
        return {
            id: session.id,
            type: session.type,
            name: session.name,
            context: JSON.parse(session.context),
            last_active: new Date(session.last_active),
            created_at: new Date(session.created_at),
            created_by: session.created_by
        }
    }

    async is_participant(session_id: string, user_id: string): Promise<boolean> {
        const participant = this.db.get('session_participants', { 
            session_id, 
            user_id, 
            is_active: 1 
        }) as any
        return !!participant
    }

    async add_participant(session_id: string, user_id: string, role: 'admin' | 'member' = 'member'): Promise<void> {
        const existing = this.db.get('session_participants', { 
            session_id, 
            user_id 
        }) as any
        
        if (existing) {
            if (!existing.is_active) {
                this.db.update('session_participants', 
                    { is_active: 1, role }, 
                    { session_id, user_id }
                )
            }
        } else {
            this.db.insert('session_participants', {
                session_id,
                user_id,
                joined_at: new Date().toISOString(),
                role,
                is_active: 1
            })
        }
    }

    async remove_participant(session_id: string, user_id: string): Promise<void> {
        this.db.update('session_participants', 
            { is_active: 0 }, 
            { session_id, user_id }
        )
    }

    async get_participants(session_id: string): Promise<SessionParticipant[]> {
        const participants = this.db.all('session_participants', { 
            session_id, 
            is_active: 1 
        }) as any[]
        
        return participants.map(p => ({
            session_id: p.session_id,
            user_id: p.user_id,
            joined_at: new Date(p.joined_at),
            role: p.role,
            is_active: !!p.is_active
        }))
    }

    async update_context(session_id: string, context: Partial<Session['context']>): Promise<void> {
        const session = this.db.get('sessions', { id: session_id }) as any
        if (!session) {
            throw new Error(`Session ${session_id} not found`)
        }
        
        const currentContext = JSON.parse(session.context)
        const updatedContext = { ...currentContext, ...context }
        
        this.db.update('sessions', 
            { 
                context: JSON.stringify(updatedContext),
                last_active: new Date().toISOString()
            }, 
            { id: session_id }
        )
    }

    async add_message(session_id: string, message: Omit<Message, 'id' | 'session_id'>): Promise<string> {
        const message_id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        
        this.db.transaction(() => {
            this.db.insert('session_messages', {
                id: message_id,
                session_id,
                from: message.from,
                user_id: message.user_id || null,
                content: message.content,
                timestamp: message.timestamp.toISOString()
            })
            
            this.db.update('sessions', 
                { last_active: message.timestamp.toISOString() }, 
                { id: session_id }
            )
        })
        
        return message_id
    }

    async get_messages(session_id: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
        const messages = this.db.all(
            'session_messages',
            { session_id },
            { order_by: 'timestamp desc', limit }
        ) as any[]
        
        return messages.reverse().map(msg => ({
            id: msg.id,
            session_id: msg.session_id,
            from: msg.from,
            user_id: msg.user_id,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
        }))
    }

    async get_unread_message_count(session_id: string, user_id: string): Promise<number> {
        const lastRead = this.db.get('user_session_reads', { 
            session_id, 
            user_id 
        }) as any
        
        const lastReadAt = lastRead ? new Date(lastRead.last_read_at) : new Date(0)
        
        const unreadCount = this.db.count('session_messages', {
            session_id,
            timestamp: ['>', lastReadAt.toISOString()]
        })
        
        return unreadCount
    }

    async mark_as_read(session_id: string, user_id: string): Promise<void> {
        const now = new Date().toISOString()
        
        const existing = this.db.get('user_session_reads', { 
            session_id, 
            user_id 
        }) as any
        
        if (existing) {
            this.db.update('user_session_reads', 
                { last_read_at: now }, 
                { session_id, user_id }
            )
        } else {
            this.db.insert('user_session_reads', {
                session_id,
                user_id,
                last_read_at: now
            })
        }
    }

    async cleanup_expired_sessions(max_age_hours: number = 24): Promise<void> {
        const cutoff = new Date(Date.now() - max_age_hours * 60 * 60 * 1000)
        
        this.db.transaction(() => {
            const sessions = this.db.all('sessions', { last_active: ['<', cutoff.toISOString()] }) as any[]
            const sessionIds = sessions.map(s => s.id)
            
            if (sessionIds.length > 0) {
                this.db.delete('session_messages', { session_id: ['in', sessionIds] })
                this.db.delete('session_participants', { session_id: ['in', sessionIds] })
                this.db.delete('user_session_reads', { session_id: ['in', sessionIds] })
                this.db.delete('sessions', { id: ['in', sessionIds] })
            }
            
            this.logger.log('info', `Cleaned up ${sessions.length} expired sessions older than ${max_age_hours} hours`)
        })
    }

    async delete_session(session_id: string): Promise<void> {
        this.db.transaction(() => {
            this.db.delete('session_messages', { session_id })
            this.db.delete('session_participants', { session_id })
            this.db.delete('user_session_reads', { session_id })
            this.db.delete('sessions', { id: session_id })
        })
    }
} 