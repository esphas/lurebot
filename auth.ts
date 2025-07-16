import { Database, Statement } from "better-sqlite3";

export class Auth {

    constructor(private db: Database) {

        db.prepare(`create table if not exists auth_scope (
            id integer primary key,
            name text
        )`).run()
        db.prepare(`insert or ignore into auth_scope (id, name) values
            (1, 'system'),
            (2, 'group')
        `).run()

        db.prepare(`create table if not exists auth_role (
            id integer primary key,
            name text
        )`).run()
        db.prepare(`insert or ignore into auth_role (id, name) values
            (1, 'admin'),
            (2, 'moderator'),
            (3, 'user')
        `).run()

        db.prepare(`create table if not exists auth_permission (
            id integer primary key,
            name text
        )`).run()
        db.prepare(`insert or ignore into auth_permission (id, name) values
            (1, 'moderation'),
            (2, 'chat')
        `).run()

        db.prepare(`create table if not exists auth_role_permission (
            role_id integer not null,
            permission_id integer not null,
            primary key (role_id, permission_id)
        )`).run()
        db.prepare(`insert or ignore into auth_role_permission (role_id, permission_id) values
            (1, 0),
            (2, 1),
            (2, 2),
            (3, 2)
        `).run()

        db.prepare(`create table if not exists auth_user (
            user_id text primary key
        )`).run()

        db.prepare(`create table if not exists auth_user_scope_role (
            user_id text not null,
            scope_id integer not null,
            role_id integer not null,
            primary key (user_id, scope_id)
        )`).run()

        db.prepare(`create table if not exists auth_group (
            group_id text primary key
        )`).run()
    }

    userCount() {
        const result = this.db.prepare(`select count(*) as count from auth_user`).get()
        return (result as { count: number }).count
    }

    createAdmin(user_id: string | number) {
        this.createUser(user_id)
        this.db.prepare(`insert or ignore into auth_user_scope_role (user_id, scope_id, role_id) values (?, 1, 1)`).run(String(user_id))
    }

    isAdmin(user_id: string | number) {
        const result = this.db.prepare(`select count(*) as count from auth_user_scope_role where user_id = ? and scope_id = 1 and role_id = 1`).get(String(user_id))
        return (result as { count: number }).count > 0
    }

    createUser(user_id: string | number) {
        this.db.prepare(`insert or ignore into auth_user (user_id) values (?)`).run(String(user_id))
    }

    isUser(user_id: string | number) {
        const result = this.db.prepare(`select count(*) as count from auth_user where user_id = ?`).get(String(user_id))
        return (result as { count: number }).count > 0
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
        stmt.run(String(id))
    }

    isGroupAllowed(group_id: string | number) {
        const result = this.db.prepare(`select count(*) as count from auth_group where group_id = ?`).get(String(group_id))
        return (result as { count: number }).count > 0
    }
}
