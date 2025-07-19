import sqlite3 from 'better-sqlite3'
import { Logger } from 'winston'

export interface Migration {
    version: number
    up: string[]
    down?: string[]
}

export class MigrationManager {
    private db: sqlite3.Database

    constructor(db: sqlite3.Database, private logger: Logger) {
        this.db = db
        this.init_migrations()
    }

    log(level: string, message: string) {
        this.logger.log(level, message)
    }

    init_migrations() {
        this.db.prepare(`create table if not exists migrations (
            version integer primary key,
            applied_at datetime default current_timestamp
        )`).run()
    }

    run_migrations(migrations: Migration[]) {
        const applied_versions = this.db.prepare('select version from migrations order by version').all() as { version: number }[]
        const applied_versions_set = new Set(applied_versions.map(v => v.version))

        for (const migration of migrations) {
            if (!applied_versions_set.has(migration.version)) {
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
        const current_version = this.get_current_version()
        const applied_versions = this.get_migration_versions()
        
        this.log('info', `当前数据库版本: ${current_version}`)
        this.log('info', `已应用的迁移: ${applied_versions.join(', ')}`)
    }

    show_migration_history() {
        const results = this.db.prepare('select * from migrations order by version').all() as any[]
        
        this.log('info', '迁移历史:')
        for (const migration of results) {
            this.log('info', `  v${migration.version} - ${migration.applied_at}`)
        }
    }

    check_migrations(migrations: Migration[]) {
        const applied_versions = this.get_migration_versions()
        const applied_versions_set = new Set(applied_versions)
        
        const pending_migrations = migrations.filter(m => !applied_versions_set.has(m.version))
        
        if (pending_migrations.length > 0) {
            this.log('info', `待应用的迁移: ${pending_migrations.map(m => m.version).join(', ')}`)
            return pending_migrations
        } else {
            this.log('info', '所有迁移已应用')
            return []
        }
    }
}
