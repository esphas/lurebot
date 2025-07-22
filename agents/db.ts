import { SqliteError } from "better-sqlite3";

import { Command } from "../agent/command";

export const commands = [
  {
    managed: false,
    event: "message",
    permission: "root",
    symbol: "!",
    name: "db|sql",
    pattern: "((?:.|\n)+)",
    handler: async (context, match, app) => {
      const sql = match![2].trim();

      try {
        if (sql.startsWith("select")) {
          const result = app!.db.prepare(sql).all();
          await context.reply(`Result: ${JSON.stringify(result)}`);
        } else {
          const result = app!.db.prepare(sql).run();
          await context.reply(`Result: ${result.changes} rows affected`);
        }
      } catch (error) {
        if (error instanceof SqliteError) {
          await context.reply(
            `SqliteError: code[${error.code}] message[${error.message}]`,
          );
        } else {
          await context.reply(`Error: ${error}`);
        }
      }
    },
  } as Command<"message">,
] as Command[];
