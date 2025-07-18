import { Logger } from 'winston'
import { Database } from './db'

export interface AuthConfig {
    scopes: Array<{ id: string }>
    roles: Array<{ id: string }>
    permissions: Array<{ id: string }>
    rolePermissions: Array<{ roleId: string; permissionId: string }>
}

export const AUTH_SCOPES = ['global', 'private', 'group'] as const
export type AuthScope = typeof AUTH_SCOPES[number]

export const AUTH_ROLES = ['admin', 'moderator', 'user'] as const
export type AuthRole = typeof AUTH_ROLES[number]

export const AUTH_PERMISSIONS = ['root', 'moderate', 'chat'] as const
export type AuthPermission = typeof AUTH_PERMISSIONS[number]

const defaultConfig: AuthConfig = {
    scopes: AUTH_SCOPES.map(scope => ({ id: scope })),
    roles: AUTH_ROLES.map(role => ({ id: role })),
    permissions: AUTH_PERMISSIONS.map(permission => ({ id: permission })),
    rolePermissions: [
        { roleId: 'admin', permissionId: 'root' },
        { roleId: 'admin', permissionId: 'moderate' },
        { roleId: 'admin', permissionId: 'chat' },
        { roleId: 'moderator', permissionId: 'moderate' },
        { roleId: 'moderator', permissionId: 'chat' },
        { roleId: 'user', permissionId: 'chat' }
    ]
} as AuthConfig

export class Auth {
    private config: AuthConfig

    constructor(private db: Database, private logger: Logger) {
        this.config = defaultConfig
        
        for (const scope of this.config.scopes) {
            this.db.insert('auth_scope', { id: scope.id })
        }

        for (const role of this.config.roles) {
            this.db.insert('auth_role', { id: role.id })
        }

        for (const permission of this.config.permissions) {
            this.db.insert('auth_permission', { id: permission.id })
        }

        for (const rp of this.config.rolePermissions) {
            this.db.insert('auth_role_permission', { role_id: rp.roleId, permission_id: rp.permissionId })
        }
    }

    info(message: string) {
        this.logger.log('info', message)
    }

    userCount() {
        return this.db.count('auth_user', {})
    }

    isRegisteredUser(user_id: string | number) {
        return this.db.has('auth_user', { user_id })
    }

    isRegisteredGroup(group_id: string | number) {
        return this.db.has('auth_group', { group_id })
    }

    canRole(role_id: AuthRole, permission_id: AuthPermission) {
        return this.db.has('auth_role_permission', { role_id, permission_id })
    }

    can({ user_id, group_id }: { user_id: string | number, group_id?: string | number }, permission_id: AuthPermission) {
        if (!this.isRegisteredUser(user_id)) { return false }

        let scope_id: AuthScope | null = null
        let scope_info: string = ''
        if (group_id) {
            if (this.isRegisteredGroup(group_id)) {
                scope_id = 'group'
                scope_info = group_id.toString()
            } else {
                return false
            }
        } else {
            scope_id = 'private'
        }

        const local_role_id = this.db.get('auth_user_scope_role', { user_id, scope_id, scope_info })?.role_id as AuthRole ?? 'user'
        if (this.canRole(local_role_id, permission_id)) {
            return true
        }

        const global_role_id = this.db.get('auth_user_scope_role', { user_id, scope_id: 'global' })?.role_id as AuthRole | undefined
        if (global_role_id != null && this.canRole(global_role_id, permission_id)) {
            return true
        }

        return false
    }

    mod(action: 'add' | 'remove', type: 'group' | 'user', id: string | number) {
        let stmt: any
        if (action === 'add') {
            if (type === 'group') {
                stmt = this.db.insert('auth_group', { id })
            } else {
                stmt = this.db.insert('auth_user', { id })
            }
        } else {
            if (type === 'group') {
                stmt = this.db.delete('auth_group', { id })
            } else {
                stmt = this.db.delete('auth_user', { id })
            }
        }
        const result = stmt.run(id)
        return result.changes > 0
    }

    assign_role(user_id: string | number, scope_id: AuthScope, scope_info: string, role: AuthRole) {
        this.db.insert('auth_user_scope_role', { user_id, scope_id, scope_info, role_id: role })
    }

    createAdmin(user_id: string | number) {
        this.mod('add', 'user', user_id)
        this.assign_role(user_id, 'global', '', 'admin')
    }

    isAdmin(user_id: string | number) {
        return this.db.has('auth_user_scope_role', { user_id, scope_id: 'global', role_id: 'admin' })
    }

    assign_error_report_listener(user_id: string | number, listening: boolean) {
        this.db.update('auth_user', { error_report_listening: listening ? 1 : 0 }, { user_id })
    }

    get_error_report_listeners(group_id?: string | number) {
        const users = this.db.all('auth_user', { error_report_listening: 1 }) as { user_id: string }[]
        const listeners = users.filter(user => this.can({ user_id: user.user_id, group_id }, 'moderate'))
        return listeners.map(user => user.user_id)
    }
}
