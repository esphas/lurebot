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

export type GeneralNapcatMessage = {
  user_id: number;
  group_id?: number;
  sender?: {
    nickname: string;
  };
};

type RepoMap = {
  auth: Auth;
  user: UserRepository;
  group: GroupRepository;
  scope: ScopeRepository;
  user_scope_role: UserScopeRoleRepository;
};
type SafeCallDesc = {
  [K in keyof RepoMap]: (keyof RepoMap[K])[];
};
const SAFE_CALL_PERMISSIONS = [
  "always",
  "chat",
  "trusted",
  "moderate",
  "root",
] as const;
type SafeCallPermission = (typeof SAFE_CALL_PERMISSIONS)[number];
const SAFE_CALL_DESC_MAP = {
  always: {
    auth: ["admin", "claim_admin", "can"],
    user: ["from_napcat", "is_banned", "is_registered", "is_valid"],
    group: ["from_napcat", "is_banned", "is_registered", "is_valid"],
    scope: ["from_napcat", "global", "private", "group"],
    user_scope_role: ["find_users_with_role", "get_role", "get_permissions"],
  },
  chat: {
    auth: [],
    user: [],
    group: [],
    scope: [],
    user_scope_role: [],
  },
  trusted: {
    auth: [],
    user: [],
    group: [],
    scope: [],
    user_scope_role: [],
  },
  moderate: {
    auth: [],
    user: ["ban", "unban"],
    group: [],
    scope: [],
    user_scope_role: [],
  },
  root: {
    auth: ["assign", "revoke"],
    user: ["register", "unregister"],
    group: ["register", "unregister", "ban", "unban"],
    scope: [],
    user_scope_role: [],
  },
} as const satisfies {
  [K in SafeCallPermission]: SafeCallDesc;
};
type SafeCallDescMap = typeof SAFE_CALL_DESC_MAP;
const pick = <
  T extends SafeCallPermission,
  R extends keyof RepoMap,
  A extends RepoMap[R] = RepoMap[R],
  K extends keyof A & SafeCallDescMap[T][R][number] = keyof A &
    SafeCallDescMap[T][R][number],
>(
  t: A,
  keys: K[],
): Pick<A, K> => {
  return Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    keys.map((k) => [k, (t[k] as unknown as Function).bind(t)]),
  ) as Pick<A, K>;
};
export type SafeCalls = Auth["safe_calls"];

export type Merge2<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends object
        ? B[K] extends object
          ? Merge2<A[K], B[K]>
          : B[K]
        : B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Merge<T extends any[]> = T extends [infer A, infer B, ...infer Rest]
  ? Merge<[Merge2<A, B>, ...Rest]>
  : T extends [infer Only]
    ? Only
    : unknown;
export type AllCalls = Merge<
  [
    SafeCalls["always"],
    SafeCalls["chat"],
    SafeCalls["trusted"],
    SafeCalls["moderate"],
    SafeCalls["root"],
  ]
>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth_t = <T extends keyof SafeCalls>(t: any) => {
  return t as unknown as SafeCalls[T];
};

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

  _calc_safe_calls() {
    const pick_fn = <T extends SafeCallPermission>(d: SafeCallDescMap[T]) => {
      return {
        auth: pick<T, "auth">(this, d["auth"]),
        user: pick<T, "user">(this.user, d["user"]),
        group: pick<T, "group">(this.group, d["group"]),
        scope: pick<T, "scope">(this.scope, d["scope"]),
        user_scope_role: pick<T, "user_scope_role">(
          this.user_scope_role,
          d["user_scope_role"],
        ),
      };
    };
    return Object.fromEntries(
      SAFE_CALL_PERMISSIONS.map((k) => [k, pick_fn(SAFE_CALL_DESC_MAP[k])]),
    ) as unknown as {
      [K in SafeCallPermission]: ReturnType<typeof pick_fn<K>>;
    };
  }
  private _safe_calls?: ReturnType<typeof this._calc_safe_calls>;
  get safe_calls() {
    if (this._safe_calls == null) {
      this._safe_calls = this._calc_safe_calls();
    }
    return this._safe_calls;
  }

  get_safe_calls(user_id: number, scope_id: number) {
    const calls = this.safe_calls;

    const permissions = this.user_scope_role
      .get_permissions(user_id, scope_id)
      .filter((p) => ["chat", "trusted", "moderate", "root"].includes(p)) as (
      | "always"
      | "chat"
      | "trusted"
      | "moderate"
      | "root"
    )[];
    permissions.unshift("always" as const);

    const all_calls = permissions.reduce((acc, perm) => {
      return {
        ...acc,
        ...(calls[perm] as AllCalls),
      };
    }, {} as AllCalls);
    return [permissions, all_calls] as const;
  }

  from_napcat(context: GeneralNapcatMessage) {
    return {
      user: this.user.from_napcat(context),
      group: this.group.from_napcat(context),
      scope: this.scope.from_napcat(context),
    };
  }

  admin() {
    const scope = this.scope.global();
    const users = this.user_scope_role.find_users_with_role(scope.id, "admin");
    if (users.length === 0) {
      return null;
    }
    return users[0];
  }

  claim_admin(user_id: number) {
    const current_admin = this.admin();
    if (current_admin != null) {
      return false;
    }
    this.assign(user_id, this.scope.global().id, "admin");
    return true;
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
