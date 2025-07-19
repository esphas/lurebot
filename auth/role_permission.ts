import { Logger } from 'winston'
import { Database, Repository } from '../db'
import { Auth } from '.'

const ROLES = ['admin', 'moderator', 'user'] as const
export type Roles = typeof ROLES[number]
export interface Role {
    id: Roles
}

const PERMISSIONS = ['root', 'moderate', 'chat'] as const
export type Permissions = typeof PERMISSIONS[number]
export interface Permission {
    id: Permissions
}

const BASIC_ROLE_PERMISSIONS: Record<Roles, Permissions[]> = {
    admin: ['root', 'moderate', 'chat'],
    moderator: ['moderate', 'chat'],
    user: ['chat']
}
export interface RolePermission {
    role_id: Roles
    permission_id: Permissions
}

export class RoleRepository extends Repository<Role> {
    constructor(private auth: Auth, db: Database, logger: Logger) {
        super(db, logger, 'auth_role')
    }

    get transform() {
        return {
            id: this.tf.id,
        }
    }

    init() {
        for (const role of ROLES) {
            this.add(role)
        }
    }

    private add(id: Roles) {
        this.insert({ id }, 'ignore')
    }

    get_permissions(role_id: Roles) {
        return this.auth.role_permission.select({ role_id }).map(rp => rp.permission_id)
    }
}

export class PermissionRepository extends Repository<Permission> {
    constructor(private auth: Auth, db: Database, logger: Logger) {
        super(db, logger, 'auth_permission')
    }

    get transform() {
        return {
            id: this.tf.id,
        }
    }

    init() {
        for (const permission of PERMISSIONS) {
            this.add(permission)
        }
    }

    private add(id: Permissions) {
        this.insert({ id }, 'ignore')
    }

    get_roles(permission_id: Permissions) {
        return this.auth.role_permission.select({ permission_id }).map(rp => rp.role_id)
    }
}

export class RolePermissionRepository extends Repository<RolePermission> {

    constructor(private auth: Auth, db: Database, logger: Logger) {
        super(db, logger, 'auth_role_permission')
    }

    get transform() {
        return {
            role_id: this.tf.id,
            permission_id: this.tf.id,
        }
    }

    init() {
        for (const role of ROLES) {
            for (const permission of BASIC_ROLE_PERMISSIONS[role]) {
                this.allow(role, permission)
            }
        }
    }

    has(role_id: Roles, permission_id: Permissions) {
        return this.exists({ role_id, permission_id })
    }

    allow(role_id: Roles, permission_id: Permissions) {
        this.insert({ role_id, permission_id }, 'ignore')
    }

    deny(role_id: Roles, permission_id: Permissions) {
        this.delete({ role_id, permission_id })
    }
}
