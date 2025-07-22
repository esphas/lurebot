import { Logger } from 'winston'
import { Database, Repository } from '../db'
import { Auth, GeneralNapcatMessage } from '.'

export interface User {
    id: number
    qq: number | null
    qq_name: string
    registered: boolean
    banned_until: Date | null
    error_notify: boolean
    created_at: Date
}

export interface UserDB {
    id: number
    qq: number
    qq_name: string
    registered: 0 | 1
    banned_until: string
    error_notify: 0 | 1
    created_at: string
}

export class UserRepository extends Repository<User, UserDB> {
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'auth_user')
    }

    get transform() {
        return {
            id: this.tf.id,
            qq: this.tf.id_or(0),
            qq_name: this.tf.id,
            registered: this.tf.bool,
            banned_until: this.tf.date_or(''),
            error_notify: this.tf.bool,
            created_at: this.tf.date,
        }
    }

    from_napcat(context: GeneralNapcatMessage) {
        const qq = context.user_id
        const user = this.get({ qq })
        const nickname = context.sender?.nickname ?? ''
        if (user) {
            if (!context.group_id && nickname && user.qq_name !== nickname) {
                user.qq_name = nickname
                this.update({ qq_name: nickname }, { id: user.id })
            }
            return user
        }
        const new_user = this.insert({ qq, qq_name: nickname })
        if (!new_user) {
            throw new Error('Failed to create user')
        }
        return new_user
    }

    ban(id: number, until: Date | null = null) {
        let banned_until = until
        if (until == null) {
            banned_until = new Date()
            banned_until.setFullYear(banned_until.getFullYear() + 1)
        }
        this.update({ banned_until }, { id })
    }

    unban(id: number) {
        this.update({ banned_until: null }, { id })
    }

    is_banned(id: number, time: Date = new Date()) {
        const user = this.get({ id })
        if (user == null) {
            return false
        }
        return user.banned_until != null && user.banned_until > time
    }

    register(id: number) {
        return this.update({ registered: true }, { id })
    }

    unregister(id: number) {
        return this.update({ registered: false }, { id })
    }

    is_registered(id: number) {
        const user = this.get({ id })
        if (user == null) {
            return false
        }
        return user.registered
    }

    is_valid(id: number, time: Date = new Date()) {
        const user = this.get({ id })
        if (user == null) {
            return false
        }
        return (
            user.registered &&
            !(user.banned_until != null && user.banned_until > time)
        )
    }
}
