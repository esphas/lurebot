import { EventKey } from "node-napcat-ts";
import { Context } from "./context";

export type CommandSymbol = "!" | "#" | "." | "/";

export interface Command<T extends EventKey = EventKey> {
  event: T;
  disabled?: boolean;
  permission?: string | ["and" | "or", ...string[]];
  symbol?: CommandSymbol | CommandSymbol[];
  name: string;
  pattern?: string;
  handler: (
    context: Context<T>,
    match: RegExpMatchArray | null,
  ) => Promise<void>;
}

export interface CommandControl {
  enable: () => void;
  disable: () => void;
  unload: () => void;
}
