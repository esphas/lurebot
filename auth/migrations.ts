
export interface Migration {
    version: number
    up: string[]
    down?: string[]
}

export default [
    {
        version: 1,
        up: [
            `create table if not exists auth_scope (
                id text primary key
            )`,
            
            `create table if not exists auth_role (
                id text primary key
            )`,
            
            `create table if not exists auth_permission (
                id text primary key
            )`,
            
            `create table if not exists auth_role_permission (
                role_id text not null,
                permission_id text not null,
                primary key (role_id, permission_id),
                foreign key (role_id) references auth_role(id) on delete cascade,
                foreign key (permission_id) references auth_permission(id) on delete cascade
            )`,
            
            `create table if not exists auth_user (
                user_id text primary key,
                created_at datetime default current_timestamp,
                error_report_listening integer default 0
            )`,
            
            `create table if not exists auth_user_scope_role (
                user_id text not null,
                scope_id text not null,
                scope_info text not null,
                role_id text not null,
                primary key (user_id, scope_id, scope_info),
                foreign key (user_id) references auth_user(user_id) on delete cascade,
                foreign key (scope_id) references auth_scope(id) on delete cascade,
                foreign key (role_id) references auth_role(id) on delete cascade
            )`,
            
            `create table if not exists auth_group (
                group_id text primary key,
                created_at datetime default current_timestamp
            )`,
        ]
    }
] as Migration[]
