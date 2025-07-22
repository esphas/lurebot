import { EventKey } from 'node-napcat-ts'
import { Context } from './context'
import { App } from '../app'

export type CommandSymbol = '!' | '#' | '.' | '/'

export interface Command<T extends EventKey = EventKey> {
    managed?: boolean
    event: T
    disabled?: boolean
    permission?: string | ['and' | 'or', ...string[]]
    symbol?: CommandSymbol | CommandSymbol[]
    name: string
    pattern?: string
    handler: (
        context: Context<T>,
        match: RegExpMatchArray | null,
        app: App | null,
    ) => Promise<void>
}

export interface CommandControl {
    enable: () => void
    disable: () => void
    unload: () => void
}
