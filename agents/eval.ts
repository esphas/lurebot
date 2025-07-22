import { Command } from "../agent/command";

export const commands = [
  {
    managed: false,
    event: "message",
    permission: "root",
    symbol: "!",
    name: "eval",
    pattern: "((?:.|\n)+)",
    handler: async (context, match, app) => {
      const script = match![2].trim();

      try {
        const func = new Function(script).bind(app);
        const result = func();
        await context.reply(JSON.stringify(result, null, 2));
      } catch (error) {
        if (error instanceof Error) {
          await context.reply(`Error: ${error.message} ${error.stack}`);
        } else {
          await context.reply(`Error: ${error}`);
        }
      }
    },
  } as Command<"message">,
] as Command[];
