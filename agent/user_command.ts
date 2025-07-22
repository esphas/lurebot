import { Logger } from 'winston'

import { Database, Repository } from '../db'
import { Auth } from '../auth'

export interface UserCommand {
    id: number
    name: string
    pattern: string
    content: string
    created_by: number
    created_at: Date
}

export interface UserCommandDB {
    id: number
    name: string
    pattern: string
    content: string
    created_by: number
    created_at: string
}

export class UserCommandRepository extends Repository<
    UserCommand,
    UserCommandDB
> {
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'user_command')
    }

    get transform() {
        return {
            id: this.tf.id,
            name: this.tf.id,
            pattern: this.tf.id,
            content: this.tf.id,
            created_by: this.tf.id,
            created_at: this.tf.date,
        }
    }
}
