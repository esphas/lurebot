import { Logger } from 'winston'
import {
    Database,
    Conflict,
    WhereCondition,
    QueryOptions,
    WhereValue,
} from './database'

export abstract class Repository<T, DB extends Record<keyof T, unknown> = T> {
    constructor(
        protected db: Database,
        protected logger: Logger,
        protected table: string,
    ) {}

    log(level: string, message: string) {
        this.logger.log(level, message)
    }

    get tf() {
        return {
            id: {
                raw: <V>(value: V) => value,
                from_raw: <V>(value: V) => value,
            },
            id_or: <V>(null_value: V) => ({
                raw: (value: V | null) => value ?? null_value,
                from_raw: (value: V) => (value === null_value ? null : value),
            }),
            bool: {
                raw: (value: boolean) => (value ? 1 : 0),
                from_raw: (value: 0 | 1) => value === 1,
            },
            date: {
                raw: (value: Date) => value.toISOString(),
                from_raw: (value: string) => new Date(value),
            },
            date_or: <V>(null_value: V) => ({
                raw: (value: Date | null) => value?.toISOString() ?? null_value,
                from_raw: (value: string) =>
                    value === null_value ? null : new Date(value),
            }),
            json: {
                raw: <V>(value: V) => JSON.stringify(value),
                from_raw: <V>(value: string) => JSON.parse(value) as V,
            },
        }
    }

    abstract get transform(): {
        [K in keyof T]: {
            raw: (value: T[K]) => DB[K]
            from_raw: (value: DB[K]) => T[K]
        }
    }

    raw(data: Partial<T>): Partial<DB> {
        const raw_data: Partial<DB> = {}
        for (const [key, t_value] of Object.entries(data) as [
            keyof T,
            T[keyof T],
        ][]) {
            raw_data[key] = this.transform[key].raw(t_value)
        }
        ;(Object.entries(raw_data) as [keyof T, DB[keyof T]][]).forEach(
            ([key, value]) => {
                if (value === undefined) {
                    delete raw_data[key]
                }
            },
        )
        return raw_data
    }

    from_raw(raw: DB): T {
        const data: Partial<T> = {}
        for (const [key, db_value] of Object.entries(raw) as [
            keyof T,
            DB[keyof T],
        ][]) {
            data[key] = this.transform[key].from_raw(db_value)
        }
        return data as T
    }

    raw_condition(condition: WhereCondition<T>): WhereCondition<DB> {
        const raw_condition: WhereCondition<DB> = {}
        for (const [key, t_value] of Object.entries(condition) as [
            keyof T,
            T[keyof T] | WhereValue<T[keyof T]>,
        ][]) {
            if (
                typeof t_value === 'object' &&
                'operator' in t_value! &&
                'value' in t_value
            ) {
                const { operator, value } = t_value
                if (operator === 'in') {
                    raw_condition[key] = {
                        operator,
                        value: value.map(this.transform[key].raw),
                    }
                } else if (operator === 'like') {
                    raw_condition[key] = { operator, value }
                } else if (
                    operator === 'is null' ||
                    operator === 'is not null'
                ) {
                    raw_condition[key] = { operator, value: null }
                } else {
                    raw_condition[key] = {
                        operator,
                        value: this.transform[key].raw(value!),
                    }
                }
            } else {
                raw_condition[key] = this.transform[key].raw(t_value)
            }
        }
        return raw_condition
    }

    insert(data: Partial<T>, conflict?: Conflict): T | undefined {
        const raw_data = this.raw(data)
        const raw = this.db.insert<DB>(this.table, raw_data, conflict)
        if (raw == null) {
            return undefined
        }
        return this.from_raw(raw)
    }

    select(condition: WhereCondition<T>, options: QueryOptions = {}): T[] {
        const raw_condition = this.raw_condition(condition)
        return this.db
            .select<DB>(this.table, raw_condition, options)
            .map(this.from_raw.bind(this))
    }

    update(data: Partial<T>, condition: WhereCondition<T>): T[] {
        const raw_data = this.raw(data)
        const raw_condition = this.raw_condition(condition)
        return this.db
            .update<DB>(this.table, raw_data, raw_condition)
            .map(this.from_raw.bind(this))
    }

    delete(condition: WhereCondition<T>): number {
        const raw_condition = this.raw_condition(condition)
        return this.db.delete<DB>(this.table, raw_condition)
    }

    get(
        condition: WhereCondition<T>,
        options: QueryOptions = {},
    ): T | undefined {
        const raw_condition = this.raw_condition(condition)
        const raw = this.db.get<DB>(this.table, raw_condition, options)
        if (raw == null) {
            return undefined
        }
        return this.from_raw(raw)
    }

    count(condition: WhereCondition<T>): number {
        const raw_condition = this.raw_condition(condition)
        return this.db.count<DB>(this.table, raw_condition)
    }

    exists(condition: WhereCondition<T>): boolean {
        const raw_condition = this.raw_condition(condition)
        return this.db.exists<DB>(this.table, raw_condition)
    }

    upsert(data: Partial<T>, condition: WhereCondition<T>): T {
        const raw_data = this.raw(data)
        const raw_condition = this.raw_condition(condition)
        return this.from_raw(
            this.db.upsert<DB>(this.table, raw_data, raw_condition),
        )
    }
}
