import { Migration } from '../migration'

export default [
    {
        version: 1,
        up: [

            // auth
            
            `create table if not exists auth_user (
                id integer primary key,
                qq integer not null,
                registered integer not null default 0,
                banned_until text not null default '',
                error_notify integer not null default 0,
                created_at text not null default (datetime('now', 'localtime'))
            )`,
            
            `create unique index if not exists idx_auth_user_qq_unique on auth_user(qq) where qq is not null`,
            
            `create table if not exists auth_group (
                id integer primary key,
                qq integer,
                registered integer not null default 0,
                banned_until text not null default '',
                created_at text not null default (datetime('now', 'localtime'))
            )`,
            
            `create unique index if not exists idx_auth_group_qq_unique on auth_group(qq) where qq is not null`,

            `create table if not exists auth_scope (
                id integer primary key,
                type text not null constraint ck_auth_scope_type check (type in ('global', 'private', 'group')),
                extra text not null default '',
                created_at text not null default (datetime('now', 'localtime')),
                unique (type, extra)
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

            `create table if not exists auth_user_scope_role (
                user_id integer not null,
                scope_id integer not null,
                role_id text not null,
                primary key (user_id, scope_id),
                foreign key (user_id) references auth_user(id) on delete cascade,
                foreign key (scope_id) references auth_scope(id) on delete cascade,
                foreign key (role_id) references auth_role(id) on delete cascade
            )`,

            // session

            `create table if not exists sessions (
                id text primary key,
                created_at text not null default (datetime('now', 'localtime')),
                last_active text not null default (datetime('now', 'localtime')),
                topic text not null,
                created_by integer not null,
                scope_id integer not null,
                ttl integer not null default 0,
                foreign key (created_by) references auth_user(id) on delete cascade,
                foreign key (scope_id) references auth_scope(id) on delete cascade,
                unique (created_by, topic, scope_id)
            )`,
            
            `create table if not exists session_participants (
                session_id text not null,
                user_id integer not null,
                role text not null,
                joined_at text not null default (datetime('now', 'localtime')),
                last_active text not null default (datetime('now', 'localtime')),
                primary key (session_id, user_id),
                foreign key (session_id) references sessions(id) on delete cascade,
                foreign key (user_id) references auth_user(id) on delete cascade
            )`,
            
            `create table if not exists session_variables (
                session_id text not null,
                key text not null,
                value text not null,
                created_at text not null default (datetime('now', 'localtime')),
                updated_at text not null default (datetime('now', 'localtime')),
                primary key (session_id, key),
                foreign key (session_id) references sessions(id) on delete cascade
            )`,
        ]
    }
] as Migration[] 