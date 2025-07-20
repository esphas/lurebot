import ms from "ms";

import { Agent } from "../agent";

export default async (agent: Agent) => {
  const { auth, quick, sessions, llm } = agent.app;

  agent.on("message", async (context) => {
    const match = context.raw_message.match(
      /^.(?:chat)(?:\[(.+)\])?\s((?:.|\n)+)$/,
    );
    if (!match) {
      return;
    }
    const { user, scope } = auth.from_napcat(context);
    if (!auth.can(user.id, scope.id, "chat")) {
      return;
    }

    const model = match[1] || llm.default_model;
    const user_message = match[2];

    const llm_session = sessions.get_or_create_session({
      user_id: user.id,
      topic: "llm",
      scope_id: scope.id,
    });
    if (!llm_session.ok) {
      await quick.reply(context, "无法创建个人会话");
      return;
    }

    const session_id = llm_session.data.id;

    try {
      const start_time = Date.now();
      await quick.reply(context, `正在思考... (${model})`);
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
      await quick.reply(context, `[${duration}] ${content}`);
    } catch (error) {
      await quick.reply(context, "LLM 请求失败");
      await quick.log_error(
        context,
        `LLM 请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  agent.on("message", async (context) => {
    const match = context.raw_message.match(/^.(?:chat-clear)\s*$/);
    if (!match) {
      return;
    }
    const { user, scope } = auth.from_napcat(context);
    if (!auth.can(user.id, scope.id, "chat")) {
      return;
    }

    const llm_session = sessions.find_participant_session({
      user_id: user.id,
      topic: "llm",
      scope_id: scope.id,
    });
    if (!llm_session) {
      await quick.reply(context, "没有正在进行的会话");
      return;
    }

    sessions.delete_session(llm_session.id);
    await quick.reply(context, "会话已清除");
  });
};
