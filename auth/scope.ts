import { Logger } from 'winston'
import { Database, Repository } from '../db'
import { Auth, GeneralNapcatMessage } from '.'

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
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'auth_scope')
    }

    get transform() {
        return {
            id: this.tf.id,
            type: this.tf.id,
            extra: this.tf.id_or(''),
            created_at: this.tf.date,
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

    from_napcat(context: GeneralNapcatMessage) {
        const user = this.auth.user.from_napcat(context)
        const nickname = context.sender?.nickname ?? ''
        if (context.group_id) {
            const group = this.auth.group.from_napcat(context)
            if (group != null) {
                const scope = this.group(group.id)
                let usr = this.auth.user_scope_role.find(user.id, scope.id)
                if (usr == null) {
                    usr = this.auth.user_scope_role.change(
                        user.id,
                        scope.id,
                        'user',
                    )
                }
                if (nickname && usr.qq_name !== nickname) {
                    this.auth.user_scope_role.update(
                        { qq_name: nickname },
                        { user_id: user.id, scope_id: scope.id },
                    )
                }
                return scope
            }
        }
        const scope = this.private(user.id)
        const usr = this.auth.user_scope_role.find(user.id, scope.id)
        if (usr == null) {
            this.auth.user_scope_role.change(user.id, scope.id, 'user')
        }
        return scope
    }
}
