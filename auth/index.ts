import { Logger } from "winston";
import { cond, Database } from "../db";

import { UserRepository } from "./user";
import { GroupRepository } from "./group";
import { ScopeRepository, ScopeType } from "./scope";
import {
  RoleRepository,
  PermissionRepository,
  RolePermissionRepository,
} from "./role_permission";
import { UserScopeRoleRepository } from "./user_scope_role";

import init from "./init";

export type { ScopeType };

export class Auth {
  public user: UserRepository;
  public group: GroupRepository;
  public scope: ScopeRepository;
  public role: RoleRepository;
  public permission: PermissionRepository;
  public role_permission: RolePermissionRepository;
  public user_scope_role: UserScopeRoleRepository;

  constructor(
    private db: Database,
    private logger: Logger,
  ) {
    this.user = new UserRepository(this, this.db, this.logger);
    this.group = new GroupRepository(this, this.db, this.logger);
    this.scope = new ScopeRepository(this, this.db, this.logger);
    this.role = new RoleRepository(this, this.db, this.logger);
    this.permission = new PermissionRepository(this, this.db, this.logger);
    this.role_permission = new RolePermissionRepository(
      this,
      this.db,
      this.logger,
    );
    this.user_scope_role = new UserScopeRoleRepository(
      this,
      this.db,
      this.logger,
    );

    this.init();
  }

  init() {
    this.scope.global();
    for (const role of init.roles) {
      this.role.add(role);
    }
    for (const permission of init.permissions) {
      this.permission.add(permission);
    }
    for (const role_permission of init.role_permissions) {
      for (const permission of role_permission.permissions) {
        this.role_permission.allow(role_permission.role, permission);
      }
    }
  }

  from_napcat(context: { user_id: number; group_id?: number }) {
    return {
      user: this.user.from_napcat(context),
      group: this.group.from_napcat(context),
      scope: this.scope.from_napcat(context),
    };
  }

  assign(user_id: number, scope_id: number, role_id: string) {
    return this.user_scope_role.change(user_id, scope_id, role_id);
  }

  revoke(user_id: number, scope_id: number) {
    return this.user_scope_role.revoke(user_id, scope_id);
  }

  can(
    user_id: number,
    scope_id: number,
    permission: string,
    include_global: boolean = true,
  ) {
    return this.user_scope_role.can(
      user_id,
      scope_id,
      permission,
      include_global,
    );
  }

  get_error_notify_users(scope_id: number) {
    const available_roles = this.permission.get_roles("moderate");
    const user_ids = this.user_scope_role
      .select({
        scope_id,
        role_id: cond.in(...available_roles),
      })
      .map((r) => r.user_id);
    const global_user_ids = this.user_scope_role
      .select({
        scope_id: this.scope.global().id,
        role_id: cond.in(...available_roles),
      })
      .map((r) => r.user_id);
    const all_user_ids = [...user_ids, ...global_user_ids];
    if (all_user_ids.length === 0) {
      return [];
    }
    return this.user.select({
      id: cond.in(...all_user_ids),
      error_notify: true,
    });
  }
}
