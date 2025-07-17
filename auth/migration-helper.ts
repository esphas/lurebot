import Database from 'better-sqlite3'
import { Migration } from './migrations'

export class MigrationHelper {
    constructor(private db: any) {}

    /**
     * 查看当前迁移状态
     */
    getMigrationStatus() {
        const currentVersion = this.getCurrentVersion()
        const appliedVersions = this.getAppliedVersions()
        
        console.log('=== 迁移状态 ===')
        console.log(`当前版本: ${currentVersion}`)
        console.log(`已应用版本: ${appliedVersions.join(', ')}`)
        
        return { currentVersion, appliedVersions }
    }

    /**
     * 获取当前数据库版本
     */
    getCurrentVersion(): number {
        const result = this.db.prepare('SELECT MAX(version) as version FROM auth_migrations').get() as { version: number | null }
        return result.version || 0
    }

    /**
     * 获取已应用的迁移版本
     */
    getAppliedVersions(): number[] {
        const results = this.db.prepare('SELECT version FROM auth_migrations ORDER BY version').all() as { version: number }[]
        return results.map(r => r.version)
    }

    /**
     * 重置迁移记录（危险操作，仅用于开发环境）
     */
    resetMigrations() {
        console.log('⚠️  警告：这将删除所有迁移记录！')
        console.log('⚠️  请确保你已经备份了数据库！')
        
        // 删除迁移记录表
        this.db.prepare('DROP TABLE IF EXISTS auth_migrations').run()
        
        // 重新创建迁移记录表
        this.db.prepare(`CREATE TABLE auth_migrations (
            version INTEGER PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`).run()
        
        console.log('✅ 迁移记录已重置')
    }

    /**
     * 手动标记迁移为已应用
     */
    markMigrationAsApplied(version: number) {
        this.db.prepare('INSERT OR IGNORE INTO auth_migrations (version) VALUES (?)').run(version)
        console.log(`✅ 版本 ${version} 已标记为已应用`)
    }

    /**
     * 合并迁移的辅助方法
     */
    mergeMigrations(migrations: Migration[], targetVersion: number) {
        console.log(`🔄 开始合并迁移到版本 ${targetVersion}`)
        
        // 收集所有 SQL 语句
        const allSql: string[] = []
        
        for (const migration of migrations) {
            if (migration.version <= targetVersion) {
                allSql.push(...migration.up)
                console.log(`📝 收集版本 ${migration.version} 的 SQL 语句`)
            }
        }
        
        console.log(`📊 总共收集了 ${allSql.length} 条 SQL 语句`)
        
        return allSql
    }

    /**
     * 安全合并迁移的完整流程
     */
    safeMergeMigrations(migrations: Migration[], targetVersion: number) {
        console.log('=== 安全合并迁移流程 ===')
        
        // 1. 检查当前状态
        const status = this.getMigrationStatus()
        
        // 2. 备份数据库
        const backupPath = `data.db.backup.${Date.now()}`
        this.db.backup(backupPath)
        console.log(`💾 数据库已备份到: ${backupPath}`)
        
        // 3. 合并 SQL 语句
        const mergedSql = this.mergeMigrations(migrations, targetVersion)
        
        // 4. 创建新的合并迁移
        const mergedMigration: Migration = {
            version: targetVersion,
            up: mergedSql
        }
        
        console.log('✅ 迁移合并完成')
        console.log('📝 请将合并后的迁移替换到 auth-migrations.ts 中')
        
        return mergedMigration
    }
}

// 使用示例
export function createMigrationHelper(dbPath: string) {
    const db = new Database(dbPath)
    return new MigrationHelper(db)
} 