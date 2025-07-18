import { Logger } from 'winston'
import { Database } from './db'

export interface AuthConfig {
    scopes: Array<{ id: string }>
    roles: Array<{ id: string }>
    permissions: Array<{ id: string }>
    rolePermissions: Array<{ roleId: string; permissionId: string }>
}

export enum AuthScope {
    Global = 'global',
    Private = 'private',
    Group = 'group'
}

export enum AuthRole {
    Admin = 'admin',
    Moderator = 'moderator',
    User = 'user'
}

export enum AuthPermission {
    Root = 'root',
    Moderate = 'moderate',
    Chat = 'chat'
}

const defaultConfig: AuthConfig = {
    scopes: Object.values(AuthScope).map(scope => ({ id: scope })),
    roles: Object.values(AuthRole).map(role => ({ id: role })),
    permissions: Object.values(AuthPermission).map(permission => ({ id: permission })),
    rolePermissions: [
        { roleId: AuthRole.Admin, permissionId: AuthPermission.Root },
        { roleId: AuthRole.Admin, permissionId: AuthPermission.Moderate },
        { roleId: AuthRole.Admin, permissionId: AuthPermission.Chat },
        { roleId: AuthRole.Moderator, permissionId: AuthPermission.Moderate },
        { roleId: AuthRole.Moderator, permissionId: AuthPermission.Chat },
        { roleId: AuthRole.User, permissionId: AuthPermission.Chat }
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

    createUser(user_id: string | number) {
        this.db.insert('auth_user', { user_id })
    }

    createAdmin(user_id: string | number) {
        this.createUser(user_id)
        this.db.insert('auth_user_scope_role', { user_id, scope_id: AuthScope.Global, scope_info: 'system', role_id: 'admin' })
    }

    isAdmin(user_id: string | number) {
        return this.db.has('auth_user_scope_role', { user_id, scope_id: AuthScope.Global, scope_info: 'system', role_id: 'admin' })
    }

    isRegisteredUser(user_id: string | number) {
        return this.db.has('auth_user', { user_id })
    }

    isRegisteredGroup(group_id: string | number) {
        return this.db.has('auth_group', { group_id })
    }

    can(user_id: string | number, group_id: string | number | null, permission: AuthPermission) {
        if (!this.isRegisteredUser(user_id)) { return false }

        const permission_id = this.db.get('auth_permission', { id: permission })?.id as string | undefined
        if (permission_id == null) { return false }

        if (group_id) {
            if (this.isRegisteredGroup(group_id)) {
                const role = this.db.get('auth_user_scope_role', { user_id, scope_id: 'group', scope_info: group_id })
                if (role != null) {
                    if (this.db.has('auth_role_permission', { role_id: role.role_id, permission_id })) {
                        return true
                    }
                }
            }
        }

        const role = this.db.get('auth_user_scope_role', { user_id, scope_id: AuthScope.Global, scope_info: 'system' })
        if (role != null) {
            if (this.db.has('auth_role_permission', { role_id: role.role_id, permission_id })) {
                return true
            }
        }

        return false
    }

    mod(action: 'add' | 'remove', type: 'group' | 'user', id: string | number) {
        let stmt: any
        if (action === 'add') {
            if (type === 'group') {
                stmt = this.db.insert('auth_group', { group_id: id })
            } else {
                stmt = this.db.insert('auth_user', { user_id: id })
            }
        } else {
            if (type === 'group') {
                stmt = this.db.delete('auth_group', { group_id: id })
            } else {
                stmt = this.db.delete('auth_user', { user_id: id })
            }
        }
        const result = stmt.run(id)
        return result.changes > 0
    }

    assign_role(user_id: string | number, group_id: string | number | null, role: AuthRole) {
        if (group_id) {
            this.db.insert('auth_user_scope_role', { user_id, scope_id: AuthScope.Group, scope_info: group_id, role_id: role })
        } else {
            this.db.insert('auth_user_scope_role', { user_id, scope_id: AuthScope.Global, scope_info: '', role_id: role })
        }
    }

    assign_error_report_listener(user_id: string | number, listening: boolean) {
        this.db.update('auth_user', { error_report_listening: listening ? 1 : 0 }, { user_id })
    }

    get_error_report_listeners(group_id: string | number | null) {
        const users = this.db.all('auth_user', { error_report_listening: 1 }) as { user_id: string }[]
        const listeners = users.filter(user => this.can(user.user_id, group_id, AuthPermission.Moderate))
        return listeners.map(user => user.user_id)
    }
}
