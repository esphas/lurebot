import sqlite3, { Statement } from 'better-sqlite3'
import { Logger } from 'winston'

import migrations from './migrations'

export interface Migration {
    version: number
    up: string[]
    down?: string[]
}

export class Database {
    private db: sqlite3.Database

    constructor(dbPath: string, private logger: Logger) {
        this.db = new sqlite3(dbPath, {
            verbose: logger.verbose
        })
        this.db.pragma('journal_mode = WAL')
        this.db.pragma('foreign_keys = ON')
        
        this.init_migrations()
        this.run_migrations(migrations)
    }

    log(level: string, message: string) {
        this.logger.log(level, message)
    }

    _condition(condition: Record<string, unknown>) : string {
        const cond = Object.keys(condition).map(key => {
            let op = '='
            const value = condition[key]
            if (Array.isArray(value) && value.length === 2) {
                op = value[0]
            }
            return `${key} ${op} ?`
        }).join(' and ')
        return cond ? `where ${cond}` : ''
    }

    get(table: string, condition: Record<string, unknown>, options: { order_by?: string, limit?: number } = {}) {
        const cond = this._condition(condition)
        const order_by = options.order_by ? `order by ${options.order_by}` : ''
        const limit = options.limit ? `limit ${options.limit}` : ''
        return this.db.prepare(`select * from ${table} ${cond} ${order_by} ${limit}`).get(...Object.values(condition)) as Record<string, unknown> | undefined
    }

    all(table: string, condition: Record<string, unknown>, options: { order_by?: string, limit?: number } = {}) {
        const cond = this._condition(condition)
        const order_by = options.order_by ? `order by ${options.order_by}` : ''
        const limit = options.limit ? `limit ${options.limit}` : ''
        return this.db.prepare(`select * from ${table} ${cond} ${order_by} ${limit}`).all(...Object.values(condition)) as Record<string, unknown>[]
    }

    count(table: string, condition: Record<string, unknown>) {
        const cond = this._condition(condition)
        const result = this.db.prepare(`select count(*) as count from ${table} ${cond}`).get(...Object.values(condition)) as { count: number }
        return result.count
    }

    has(table: string, condition: Record<string, unknown>) {
        return this.count(table, condition) > 0
    }

    insert(table: string, data: Record<string, unknown>, alt: 'ignore' | 'replace' = 'ignore') {
        const keys = Object.keys(data)
        const values = keys.map(key => data[key] as unknown)
        const placeholders = keys.map(() => '?').join(',')
        return this.db.prepare(`insert or ${alt} into ${table} (${keys.join(',')}) values (${placeholders})`).run(...values)
    }

    delete(table: string, condition: Record<string, unknown>) {
        const cond = this._condition(condition)
        return this.db.prepare(`delete from ${table} ${cond}`).run(...Object.values(condition))
    }

    update(table: string, data: Record<string, unknown>, condition: Record<string, unknown>) {
        const cond = this._condition(condition)
        const setters = Object.keys(data).map(key => `${key} = ?`).join(',')
        return this.db.prepare(`update ${table} set ${setters} ${cond}`).run(...Object.values(data), ...Object.values(condition))
    }

    transaction(callback: () => void) {
        this.db.transaction(callback)
    }

    init_migrations() {
        this.db.prepare(`create table if not exists migrations (
            version integer primary key,
            applied_at datetime default current_timestamp
        )`).run()
    }

    run_migrations(migrations: Migration[]) {
        const appliedVersions = this.db.prepare('select version from migrations order by version').all() as { version: number }[]
        const appliedVersionSet = new Set(appliedVersions.map(v => v.version))

        for (const migration of migrations) {
            if (!appliedVersionSet.has(migration.version)) {
                this.log('info', `执行数据库迁移: v${migration.version}`)
                
                const transaction = this.db.transaction(() => {
                    for (const sql of migration.up) {
                        this.db.prepare(sql).run()
                    }
                    this.db.prepare('insert into migrations (version) values (?)').run(migration.version)
                })
                
                transaction()
                this.log('info', `数据库迁移 v${migration.version} 完成`)
            }
        }
    }

    get_current_version(): number {
        const result = this.db.prepare('select max(version) as version from migrations').get() as { version: number | null }
        return result.version || 0
    }

    get_migration_versions(): number[] {
        const results = this.db.prepare('select version from migrations order by version').all() as { version: number }[]
        return results.map(r => r.version)
    }

    show_migration_status() {
        const currentVersion = this.get_current_version()
        const appliedVersions = this.get_migration_versions()
        
        this.log('info', `当前数据库版本: ${currentVersion}`)
        this.log('info', `已应用的迁移: ${appliedVersions.join(', ')}`)
    }

    show_migration_history() {
        const results = this.all('migrations', { order_by: 'version' }) as any[]
        
        this.log('info', '迁移历史:')
        for (const migration of results) {
            this.log('info', `  v${migration.version} - ${migration.applied_at}`)
        }
    }

    check_migrations(migrations: Migration[]) {
        const appliedVersions = this.get_migration_versions()
        const appliedVersionSet = new Set(appliedVersions)
        
        const pendingMigrations = migrations.filter(m => !appliedVersionSet.has(m.version))
        
        if (pendingMigrations.length > 0) {
            this.log('info', `待应用的迁移: ${pendingMigrations.map(m => m.version).join(', ')}`)
            return pendingMigrations
        } else {
            this.log('info', '所有迁移已应用')
            return []
        }
    }
}
