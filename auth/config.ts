
export interface AuthConfig {
    scopes: Array<{ id: string }>
    roles: Array<{ id: string }>
    permissions: Array<{ id: string }>
    rolePermissions: Array<{ roleId: string; permissionId: string }>
}

// enums
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

export default {
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
