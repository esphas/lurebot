import sqlite3 from 'better-sqlite3'
import { Logger } from 'winston'
import { MigrationManager } from './migration'
import migrations from './migrations'

export type QueryOptions = {
    order_by?: string
    limit?: number
    offset?: number
}

export type Conflict = 'ignore' | 'replace' | 'abort' | 'fail' | 'rollback'

export type WhereValue<V> = {
    operator: '=' | '!=' | '>' | '>=' | '<' | '<='
    value: V
} | {
    operator: 'in'
    value: V[]
} | {
    operator: 'is null' | 'is not null'
    value: null
} | {
    operator: 'like'
    value: string
}

export type WhereCondition<T> = {
    [key in keyof T]?: T[key] | WhereValue<T[key]>
}

export const cond = {
    eq<V>(value: V): WhereValue<V> {
        return { operator: '=', value }
    },

    ne<V>(value: V): WhereValue<V> {
        return { operator: '!=', value }
    },

    gt<V>(value: V): WhereValue<V> {
        return { operator: '>', value }
    },

    gte<V>(value: V): WhereValue<V> {
        return { operator: '>=', value }
    },

    lt<V>(value: V): WhereValue<V> {
        return { operator: '<', value }
    },

    lte<V>(value: V): WhereValue<V> {
        return { operator: '<=', value }
    },

    like<V>(value: string): WhereValue<V> {
        return { operator: 'like', value }
    },

    in<V>(...values: V[]): WhereValue<V> {
        return { operator: 'in', value: values }
    },

    is_null<V>(): WhereValue<V> {
        return { operator: 'is null', value: null }
    },

    is_not_null<V>(): WhereValue<V> {
        return { operator: 'is not null', value: null }
    },
}

export class Database {
    public migration: MigrationManager
    
    private db: sqlite3.Database

    constructor(db_path: string, private logger: Logger) {
        this.db = new sqlite3(db_path, {
            verbose: (...args: any[]) => {
                this.logger.log('debug', args.join(' '))
            }
        })

        this.db.pragma('journal_mode = WAL')
        this.db.pragma('foreign_keys = ON')
        this.db.pragma('synchronous = NORMAL')
        this.db.pragma('cache_size = 10000')
        this.db.pragma('temp_store = MEMORY')

        this.migration = new MigrationManager(this.db, this.logger)
        this.migration.run_migrations(migrations)
    }

    transaction<F extends (...args: any[]) => unknown>(fn: F) {
        return this.db.transaction(fn)
    }

    prepare(sql: string) {
        return this.db.prepare(sql)
    }

    exec(sql: string): void {
        this.db.exec(sql)
    }

    close(): void {
        this.db.close()
    }

    private build_where_clause<T>(condition: WhereCondition<T>): { sql: string; params: unknown[] } {
        const clauses: string[] = []
        const params: unknown[] = []

        for (const [key, value] of Object.entries(condition)) {
            if (value === null || value === undefined) {
                clauses.push(`${key} is null`)
            } else if (typeof value === 'object' && 'operator' in value && 'value' in value) {
                const op = value as WhereValue<unknown>
                if (op.operator === 'in') {
                    const values = op.value as unknown[]
                    const placeholders = values.map(() => '?').join(', ')
                    clauses.push(`${key} in (${placeholders})`)
                    params.push(...values)
                } else if (op.operator === 'is null' || op.operator === 'is not null') {
                    clauses.push(`${key} ${op.operator}`)
                } else {
                    clauses.push(`${key} ${op.operator} ?`)
                    params.push(op.value)
                }
            } else {
                clauses.push(`${key} = ?`)
                params.push(value)
            }
        }

        const sql = clauses.length > 0 ? ` where ${clauses.join(' and ')}` : ''
        return { sql, params }
    }

    private build_select_query<T>(table: string, condition: WhereCondition<T>, options: QueryOptions = {}): { sql: string; params: unknown[] } {
        const where_clause = this.build_where_clause(condition)
        const order_by_clause = options.order_by ? ` order by ${options.order_by}` : ''
        const limit_clause = options.limit ? ` limit ${options.limit}` : ''
        const offset_clause = options.offset ? ` offset ${options.offset}` : ''

        const sql = `select * from ${table}${where_clause.sql}${order_by_clause}${limit_clause}${offset_clause}`
        return { sql, params: where_clause.params }
    }

    select<T>(table: string, condition: WhereCondition<T>, options?: QueryOptions): T[] {
        const { sql, params } = this.build_select_query(table, condition, options)
        return this.db.prepare(sql).all(...params) as T[]
    }

    insert<T>(table: string, data: Partial<T>, conflict?: Conflict): T | undefined {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const placeholders = keys.map(() => '?').join(', ')
        const conflict_clause = conflict ? ` or ${conflict}` : ''
        
        const sql = `insert${conflict_clause} into ${table} (${keys.join(', ')}) values (${placeholders})`
        const result = this.db.prepare(sql).run(...values)
        
        if (result.changes > 0) {
            return this.select(table, { rowid: result.lastInsertRowid } as any)[0] as T
        }
        return undefined
    }

    update<T>(table: string, data: Partial<T>, condition: WhereCondition<T>): T[] {
        const where_clause = this.build_where_clause(condition)
        const set_clause = Object.keys(data).map(key => `${key} = ?`).join(', ')
        if (set_clause.length === 0) { return [] }
        const sql = `update ${table} set ${set_clause}${where_clause.sql}`
        const params = [...Object.values(data), ...where_clause.params]
        this.db.prepare(sql).run(...params)
        return this.select(table, condition)
    }

    delete<T>(table: string, condition: WhereCondition<T>): number {
        const where_clause = this.build_where_clause(condition)
        const sql = `delete from ${table}${where_clause.sql}`
        const result = this.db.prepare(sql).run(...where_clause.params)
        return result.changes
    }

    get<T>(table: string, condition: WhereCondition<T>, options: QueryOptions = {}): T | undefined {
        const { sql, params } = this.build_select_query(table, condition, { ...options, limit: 1 })
        return this.db.prepare(sql).get(...params) as T | undefined
    }

    count<T>(table: string, condition: WhereCondition<T>): number {
        const where_clause = this.build_where_clause(condition)
        const sql = `select count(*) as count from ${table}${where_clause.sql}`
        const result = this.db.prepare(sql).get(...where_clause.params) as { count: number }
        return result.count
    }

    exists<T>(table: string, condition: WhereCondition<T>): boolean {
        return this.count(table, condition) > 0
    }

    upsert<T>(table: string, data: Partial<T>, condition: WhereCondition<T>): T {
        this.insert(table, data, 'ignore')
        this.update(table, data, condition)
        return this.get(table, condition)!
    }
}
