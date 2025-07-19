import { Logger } from 'winston'
import { cond, Database } from '../db'

import { UserRepository } from './user'
import { GroupRepository } from './group'
import { ScopeRepository, ScopeType } from './scope'
import { RoleRepository, PermissionRepository, RolePermissionRepository, Roles, Permissions } from './role_permission'
import { UserScopeRoleRepository } from './user_scope_role'

export type { ScopeType, Roles, Permissions }

export class Auth {
    public user: UserRepository
    public group: GroupRepository
    public scope: ScopeRepository
    public role: RoleRepository
    public permission: PermissionRepository
    public role_permission: RolePermissionRepository
    public user_scope_role: UserScopeRoleRepository

    constructor(private db: Database, private logger: Logger) {
        this.user = new UserRepository(this, this.db, this.logger)
        this.group = new GroupRepository(this, this.db, this.logger)
        this.scope = new ScopeRepository(this, this.db, this.logger)
        this.role = new RoleRepository(this, this.db, this.logger)
        this.permission = new PermissionRepository(this, this.db, this.logger)
        this.role_permission = new RolePermissionRepository(this, this.db, this.logger)
        this.user_scope_role = new UserScopeRoleRepository(this, this.db, this.logger)

        this.scope.global()
        this.role.init()
        this.permission.init()
        this.role_permission.init()
    }

    from_napcat(context: { user_id: number, group_id?: number }) {
        return {
            user: this.user.from_napcat(context),
            group: this.group.from_napcat(context),
            scope: this.scope.from_napcat(context),
        }
    }

    assign(user_id: number, scope_id: number, role_id: Roles) {
        return this.user_scope_role.change(user_id, scope_id, role_id)
    }

    revoke(user_id: number, scope_id: number) {
        return this.user_scope_role.revoke(user_id, scope_id)
    }

    can(user_id: number, scope_id: number, permission: Permissions, include_global: boolean = true) {
        return this.user_scope_role.can(user_id, scope_id, permission, include_global)
    }

    get_error_notify_users(scope_id: number) {
        const available_roles = this.permission.get_roles('moderate')
        const user_ids = this.user_scope_role.select({
            scope_id,
            role_id: cond.in(...available_roles)
        }).map(r => r.user_id)
        if (user_ids.length === 0) { return [] }
        return this.user.select({
            id: cond.in(...user_ids)
        })
    }
}
