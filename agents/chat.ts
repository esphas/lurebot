import ms from "ms";

import { Command } from "../agent/command";

export const commands = [
  {
    event: "message",
    permission: "chat",
    name: "chat(?:\\[(.+)\\])?",
    pattern: "((?:.|\\n)+)",
    handler: async (context, match) => {
      const llm = context.llm;
      const sessions = context.sessions;
      const model = match![1] || llm.default_model;
      const user_message = match![2];

      const llm_session = sessions.get_or_create_session({
        user_id: context.user.id,
        topic: "llm",
        scope_id: context.scope.id,
      });
      if (!llm_session.ok) {
        await context.reply("无法创建个人会话");
        return;
      }

      const session_id = llm_session.data.id;

      try {
        const start_time = Date.now();
        await context.reply(`正在思考... (${model})`);
        const response = await llm.chat(session_id, user_message, model);
        const end_time = Date.now();
        const duration = ms(end_time - start_time);
        const content = response.content;
        sessions.add_message(session_id, {
          role: "user",
          content: user_message,
        });
        sessions.add_message(session_id, {
          role: "assistant",
          content: content,
        });
        await context.reply(`[${duration}] ${content}`);
      } catch (error) {
        await context.reply("LLM 请求失败");
        await context.notify(
          `LLM 请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  } as Command<"message">,
  {
    event: "message",
    permission: "chat",
    name: "chat-clear",
    handler: async (context) => {
      const sessions = context.sessions;

      const llm_session = sessions.find_participant_session({
        user_id: context.user.id,
        topic: "llm",
        scope_id: context.scope.id,
      });
      if (!llm_session) {
        await context.reply("没有正在进行的会话");
        return;
      }

      sessions.delete_session(llm_session.id);
      await context.reply("会话已清除");
    },
  } as Command<"message">,
] as Command[];
