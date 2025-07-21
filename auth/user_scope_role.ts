import { Logger } from "winston";
import { Database, Repository } from "../db";
import { Auth } from ".";

export interface UserScopeRole {
  user_id: number;
  scope_id: number;
  role_id: string;
  qq_name: string;
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
      qq_name: this.tf.id,
    };
  }

  change(user_id: number, scope_id: number, role_id: string) {
    return this.upsert({ user_id, scope_id, role_id }, { user_id, scope_id });
  }

  revoke(user_id: number, scope_id: number) {
    return this.delete({ user_id, scope_id });
  }

  find(user_id: number, scope_id: number) {
    return this.get({ user_id, scope_id });
  }

  find_users_with_role(scope_id: number, role_id: string) {
    return this.select({ scope_id, role_id }).map(
      (usr) => this.auth.user.get({ id: usr.user_id })!,
    );
  }

  get_role(user_id: number, scope_id: number) {
    return this.find(user_id, scope_id)?.role_id ?? null;
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
    permission: string,
    include_global: boolean = true,
  ) {
    if (!this.auth.user.is_valid(user_id)) {
      return false;
    }
    const scope = this.auth.scope.get({ id: scope_id });
    if (scope == null) {
      return false;
    }
    if (
      scope.type == "group" &&
      !this.auth.group.is_valid(Number(scope.extra))
    ) {
      return false;
    }
    const permissions = this.get_permissions(user_id, scope_id);
    if (include_global) {
      permissions.push(
        ...this.get_permissions(user_id, this.auth.scope.global().id),
      );
    }
    return permissions.includes(permission);
  }
}
