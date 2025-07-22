import { Logger } from 'winston'
import { Database, Repository } from '../db'
import { Auth } from '.'

export interface Role {
    id: string
}

export interface Permission {
    id: string
}

export interface RolePermission {
    role_id: string
    permission_id: string
}

export class RoleRepository extends Repository<Role> {
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'auth_role')
    }

    get transform() {
        return {
            id: this.tf.id,
        }
    }

    add(id: string) {
        this.insert({ id }, 'ignore')
    }

    get_permissions(role_id: string) {
        return this.auth.role_permission
            .select({ role_id })
            .map((rp) => rp.permission_id)
    }
}

export class PermissionRepository extends Repository<Permission> {
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'auth_permission')
    }

    get transform() {
        return {
            id: this.tf.id,
        }
    }

    add(id: string) {
        this.insert({ id }, 'ignore')
    }

    get_roles(permission_id: string) {
        return this.auth.role_permission
            .select({ permission_id })
            .map((rp) => rp.role_id)
    }
}

export class RolePermissionRepository extends Repository<RolePermission> {
    constructor(
        private auth: Auth,
        db: Database,
        logger: Logger,
    ) {
        super(db, logger, 'auth_role_permission')
    }

    get transform() {
        return {
            role_id: this.tf.id,
            permission_id: this.tf.id,
        }
    }

    has(role_id: string, permission_id: string) {
        return this.exists({ role_id, permission_id })
    }

    allow(role_id: string, permission_id: string) {
        this.insert({ role_id, permission_id }, 'ignore')
    }

    deny(role_id: string, permission_id: string) {
        this.delete({ role_id, permission_id })
    }
}
