import { Migration } from './db'

export default [
    {
        version: 1,
        up: [

            // auth

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

            // session

            `create table if not exists sessions (
                id text primary key,
                created_at datetime not null,
                last_active datetime not null,
                topic text not null,
                created_by text not null,
                scope text not null,
                group_id text,
                ttl integer not null default 0,
                foreign key (created_by) references auth_user(user_id) on delete cascade,
                foreign key (scope) references auth_scope(id) on delete cascade,
                foreign key (group_id) references auth_group(group_id) on delete cascade,
                unique (created_by, topic, scope, group_id)
            )`,
            
            `create table if not exists session_participants (
                session_id text not null,
                user_id text not null,
                role text not null check (role in ('owner', 'admin', 'member')),
                joined_at datetime not null,
                last_active datetime not null,
                primary key (session_id, user_id),
                foreign key (session_id) references sessions(id) on delete cascade,
                foreign key (user_id) references auth_user(user_id) on delete cascade
            )`,
            
            `create table if not exists session_messages (
                id text primary key,
                session_id text not null,
                role text not null check (role in ('user', 'bot')),
                user_id text,
                content text not null,
                timestamp datetime not null,
                foreign key (session_id) references sessions(id) on delete cascade,
                foreign key (user_id) references auth_user(user_id) on delete set null
            )`,
            
            `create table if not exists user_session_reads (
                session_id text not null,
                user_id text not null,
                last_read_at datetime not null,
                primary key (session_id, user_id),
                foreign key (session_id) references sessions(id) on delete cascade,
                foreign key (user_id) references auth_user(user_id) on delete cascade
            )`,
        ]
    }
] as Migration[] 