import { Logger } from "winston";
import { Database, Repository } from "../db";
import { Auth } from ".";
import { Roles, Permissions } from "./role_permission";

export interface UserScopeRole {
  user_id: number;
  scope_id: number;
  role_id: Roles;
}

export class UserScopeRoleRepository extends Repository<UserScopeRole> {
  constructor(
    private auth: Auth,
    db: Database,
    logger: Logger,
  ) {
    super(db, logger, "auth_user_scope_role");
  }

  get transform() {
    return {
      user_id: this.tf.id,
      scope_id: this.tf.id,
      role_id: this.tf.id,
    };
  }

  change(user_id: number, scope_id: number, role_id: Roles) {
    return this.upsert({ user_id, scope_id, role_id }, { user_id, scope_id });
  }

  revoke(user_id: number, scope_id: number) {
    return this.delete({ user_id, scope_id });
  }

  get_role(user_id: number, scope_id: number) {
    return this.get({ user_id, scope_id })?.role_id ?? null;
  }

  get_permissions(user_id: number, scope_id: number) {
    const role_id = this.get_role(user_id, scope_id);
    if (role_id == null) {
      return [];
    }
    return this.auth.role.get_permissions(role_id);
  }

  can(
    user_id: number,
    scope_id: number,
    permission: Permissions,
    include_global: boolean = true,
  ) {
    const permissions = this.get_permissions(user_id, scope_id);
    if (include_global) {
      permissions.push(
        ...this.get_permissions(user_id, this.auth.scope.global().id),
      );
    }
    return permissions.includes(permission);
  }
}
