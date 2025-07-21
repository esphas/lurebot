import { Command } from "../agent/command";

export const commands = [
  {
    name: "heartbeat",
    event: "notice.notify.poke",
    permission: "chat",
    handler: async (context) => {
      if (context.raw.target_id !== context.raw.self_id) {
        return;
      }
      await context.reply_poke();
    },
  } as Command<"notice.notify.poke">,
] as Command[];
