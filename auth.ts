import { Database, Statement } from 'better-sqlite3'
import { Logger } from 'winston'

import migrations, { Migration } from './auth/migrations'

export interface AuthConfig {
    scopes: Array<{ id: string }>
    roles: Array<{ id: string }>
    permissions: Array<{ id: string }>
    rolePermissions: Array<{ roleId: string; permissionId: string }>
}

export enum AuthScope {
    System = 'system',
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
    private migrations: Migration[] = []
    private config: AuthConfig

    constructor(private db: Database, private logger: Logger) {
        this.config = defaultConfig
        this.migrations = migrations
        
        this.init()
    }

    info(message: string) {
        this.logger.log('info', message)
    }

    private init() {
        this.db.prepare(`create table if not exists auth_migrations (
            version integer primary key,
            applied_at datetime default current_timestamp
        )`).run()

        this.runMigrations()
        this.initBaseData()
    }

    private runMigrations() {
        const appliedVersions = this.db.prepare('select version from auth_migrations order by version').all() as { version: number }[]
        const appliedVersionSet = new Set(appliedVersions.map(v => v.version))

        for (const migration of this.migrations) {
            if (!appliedVersionSet.has(migration.version)) {
                this.info(`执行数据库迁移: v${migration.version}`)
                
                // 开始事务
                const transaction = this.db.transaction(() => {
                    for (const sql of migration.up) {
                        this.db.prepare(sql).run()
                    }
                    this.db.prepare('insert into auth_migrations (version) values (?)').run(migration.version)
                })
                
                transaction()
                this.info(`数据库迁移 v${migration.version} 完成`)
            }
        }
    }

    private initBaseData() {
        for (const scope of this.config.scopes) {
            this.db.prepare(`insert or ignore into auth_scope (id) values (?)`).run(scope.id)
        }

        for (const role of this.config.roles) {
            this.db.prepare(`insert or ignore into auth_role (id) values (?)`).run(role.id)
        }

        for (const permission of this.config.permissions) {
            this.db.prepare(`insert or ignore into auth_permission (id) values (?)`).run(permission.id)
        }

        for (const rp of this.config.rolePermissions) {
            this.db.prepare(`insert or ignore into auth_role_permission (role_id, permission_id) values (?, ?)`).run(rp.roleId, rp.permissionId)
        }
    }

    addMigration(migration: Migration) {
        this.migrations.push(migration)
        this.migrations.sort((a, b) => a.version - b.version)
    }

    getCurrentVersion(): number {
        const result = this.db.prepare('select max(version) as version from auth_migrations').get() as { version: number | null }
        return result.version || 0
    }

    getMigrationVersions(): number[] {
        const results = this.db.prepare('select version from auth_migrations order by version').all() as { version: number }[]
        return results.map(r => r.version)
    }

    db_get(table: string, condition: string, ...params: unknown[]) {
        const r_condition = condition.length > 0 ? `where ${condition}` : ''
        return this.db.prepare(`select * from ${table} ${r_condition}`).get(...params) as Record<string, unknown> | undefined
    }

    db_all(table: string, condition: string, ...params: unknown[]) {
        const r_condition = condition.length > 0 ? `where ${condition}` : ''
        return this.db.prepare(`select * from ${table} ${r_condition}`).all(...params) as Record<string, unknown>[]
    }

    db_count(table: string, condition: string, ...params: unknown[]) {
        const r_condition = condition.length > 0 ? `where ${condition}` : ''
        const result = this.db.prepare(`select count(*) as count from ${table} ${r_condition}`).get(...params) as { count: number }
        return result.count
    }

    db_has(table: string, condition: string, ...params: unknown[]) {
        return this.db_count(table, condition, ...params) > 0
    }

    userCount() {
        return this.db_count('auth_user', '')
    }

    createUser(user_id: string | number) {
        this.db.prepare(`insert or ignore into auth_user (user_id) values (?)`).run(user_id)
    }

    createAdmin(user_id: string | number) {
        this.createUser(user_id)
        this.db.prepare(`insert or ignore into auth_user_scope_role (user_id, scope_id, scope_info, role_id) values (?, 'system', 'system', 'admin')`).run(user_id)
    }

    isAdmin(user_id: string | number) {
        return this.db_has('auth_user_scope_role', `user_id = ? and scope_id = 'system' and scope_info = 'system' and role_id = 'admin'`, user_id)
    }

    isRegisteredUser(user_id: string | number) {
        return this.db_has('auth_user', 'user_id = ?', user_id)
    }

    isRegisteredGroup(group_id: string | number) {
        return this.db_has('auth_group', 'group_id = ?', group_id)
    }

    can(user_id: string | number, group_id: string | number | null, permission: AuthPermission) {
        if (!this.isRegisteredUser(user_id)) { return false }

        const permission_id = this.db_get('auth_permission', 'id = ?', permission)?.id as string | undefined
        if (permission_id == null) { return false }

        if (group_id) {
            if (this.isRegisteredGroup(group_id)) {
                const role = this.db_get('auth_user_scope_role', `user_id = ? and scope_id = 'group' and scope_info = ?`, user_id, group_id)
                if (role != null) {
                    if (this.db_has('auth_role_permission', `role_id = ? and permission_id = ?`, role.role_id, permission_id)) {
                        return true
                    }
                }
            }
        }

        const role = this.db_get('auth_user_scope_role', `user_id = ? and scope_id = 'system' and scope_info = ?`, user_id, 'system')
        if (role != null) {
            if (this.db_has('auth_role_permission', `role_id = ? and permission_id = ?`, role.role_id, permission_id)) {
                return true
            }
        }

        return false
    }

    mod(action: 'add' | 'remove', type: 'group' | 'user', id: string | number) {
        let stmt: Statement
        if (action === 'add') {
            if (type === 'group') {
                stmt = this.db.prepare(`insert or ignore into auth_group (group_id) values (?)`)
            } else {
                stmt = this.db.prepare(`insert or ignore into auth_user (user_id) values (?)`)
            }
        } else {
            if (type === 'group') {
                stmt = this.db.prepare(`delete from auth_group where group_id = ?`)
            } else {
                stmt = this.db.prepare(`delete from auth_user where user_id = ?`)
            }
        }
        const result = stmt.run(id)
        return result.changes > 0
    }

    assign_role(user_id: string | number, group_id: string | number | null, role: AuthRole) {
        if (group_id) {
            this.db.prepare(`insert or ignore into auth_user_scope_role (user_id, scope_id, scope_info, role_id) values (?, 'group', ?, ?)`).run(user_id, group_id, role)
        } else {
            this.db.prepare(`insert or ignore into auth_user_scope_role (user_id, scope_id, scope_info, role_id) values (?, 'system', 'system', ?)`).run(user_id, role)
        }
    }

    assign_error_report_listener(user_id: string | number, listening: boolean) {
        this.db.prepare(`update auth_user set error_report_listening = ? where user_id = ?`).run(listening ? 1 : 0, user_id)
    }

    get_error_report_listeners(group_id: string | number | null) {
        const users = this.db_all('auth_user', `error_report_listening = 1`) as { user_id: string }[]
        const listeners = users.filter(user => this.can(user.user_id, group_id, AuthPermission.Moderate))
        return listeners.map(user => user.user_id)
    }
}
