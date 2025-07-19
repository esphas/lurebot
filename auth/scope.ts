import { Logger } from 'winston'
import { Database, Repository } from '../db'
import { Auth } from '.'

export type ScopeType = 'global' | 'private' | 'group'

export interface Scope {
    id: number
    type: ScopeType
    extra: string | null
    created_at: Date
}

export interface ScopeDB {
    id: number
    type: ScopeType
    extra: string
    created_at: string
}

export class ScopeRepository extends Repository<Scope, ScopeDB> {

    constructor(private auth: Auth, db: Database, logger: Logger) {
        super(db, logger, 'auth_scope')
    }

    get transform() {
        return {
            id: this.tf.id,
            type: this.tf.id,
            extra: this.tf.id_or(''),
            created_at: this.tf.date
        }
    }

    global() {
        this.insert({ type: 'global' }, 'ignore')
        return this.get({ type: 'global' })!
    }

    private(user_id: number) {
        this.insert({ type: 'private', extra: String(user_id) }, 'ignore')
        return this.get({ type: 'private', extra: String(user_id) })!
    }

    group(group_id: number) {
        this.insert({ type: 'group', extra: String(group_id) }, 'ignore')
        return this.get({ type: 'group', extra: String(group_id) })!
    }

    from_napcat({ user_id, group_id }: { user_id?: number, group_id?: number }) {
        if (group_id) {
            const group = this.auth.group.from_napcat({ group_id })
            if (group != null) {
                return this.group(group.id)
            }
        }
        if (user_id) {
            const user = this.auth.user.from_napcat({ user_id })
            if (user != null) {
                return this.private(user.id)
            }
        }
        return this.global()
    }
}
