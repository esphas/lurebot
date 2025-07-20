import { WSSendReturn } from "node-napcat-ts";
import ms from "ms";

import { Agent } from "../agent";
import { LLMMessage } from "../llm";

export default async (agent: Agent) => {
  const { auth, quick, llm, napcat } = agent.app;

  agent.on("message.group", async (context) => {
    const match = context.raw_message.match(
      /^.(?:summary)(?:-(\d+))?(?:\[(.+)\])?(\s(?:.|\n)+)?$/,
    );
    if (!match) {
      return;
    }
    const { user, scope } = auth.from_napcat(context);
    if (!auth.can(user.id, scope.id, "chat")) {
      return;
    }

    const count = match[1] ? parseInt(match[1]) : 300;
    const model = match[2] || llm.default_model;
    const question = match[3];

    try {
      const start_time = Date.now();
      await quick.reply(
        context,
        `好的，让我查看一下最近的聊天记录... (${model})`,
      );

      const history = format_history(
        (
          await napcat.get_group_msg_history({
            group_id: context.group_id,
            message_seq: 0,
            count,
          })
        ).messages,
      );

      const messages = [
        {
          role: "system",
          content: [
            `你正处在一个群聊中，以下是该群聊最近的聊天记录，请根据这些记录总结出群聊的概况，并回答用户的问题。`,
            `其中 QQ 号为 ${context.self_id} 的是你。`,
            `由于聊天环境为群聊，请避免使用 Markdown 格式，以方便用户阅读。`,
            `下面是聊天记录：`,
          ].join("\n"),
        },
        {
          role: "system",
          content: history,
        },
        {
          role: "user",
          content: question || "最近在聊些什么？",
        },
      ] as LLMMessage[];

      const response = await llm.chat_completions(messages, model);

      const end_time = Date.now();
      const duration = ms(end_time - start_time);

      const content = response.content;
      await quick.reply(context, `[${duration}] ${content}`);
    } catch (error) {
      await quick.reply(context, "LLM 请求失败");
      await quick.log_error(
        context,
        `LLM 请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
};

function format_history(messages: WSSendReturn["get_msg"][]) {
  return messages
    .map((message, index) => {
      const meta = `#${index + 1} 消息${message.message_id}：${message.sender.nickname}(${message.sender.user_id}) ${new Date(message.time.toLocaleString())}`;
      const content = message.message.map((m) => format_message(m)).join("");
      return `${meta}\n${content}`;
    })
    .join("\n\n");
}

function format_message(message: WSSendReturn["get_msg"]["message"][number]) {
  switch (message.type) {
    case "text":
      return message.data.text;
    case "at":
      return `@${message.data.qq} `;
    case "poke":
      return `戳一戳 ${message.data.id}`;
    case "image":
      return `[图片]`;
    case "file":
      return `[文件=${message.data.file}]`;
    case "dice":
      return `[骰子=${message.data.result}]`;
    case "rps":
      return `[猜拳=${message.data.result}]`;
    case "face":
      return `[表情=${message.data.id}]`;
    case "reply":
      return `[回复=${message.data.id}]`;
    case "video":
      return `[视频=${message.data.file}]`;
    case "record":
      return `[语音=${message.data.file}]`;
    case "forward":
      return `[转发=${message.data.id}]`;
    case "json":
      return `[JSON=${message.data.data}]`;
    case "markdown":
      return `[Markdown=${message.data.content}]`;
    default:
      return "[未知消息]";
  }
}
