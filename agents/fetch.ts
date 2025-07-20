import { Agent } from "../agent";

export default async (agent: Agent) => {
  const { auth, quick } = agent.app;

  agent.on("message", async (context) => {
    const match = context.raw_message.match(/^.(fetch|f)\s+(.+)$/);
    if (!match) {
      return;
    }

    const { user, scope } = auth.from_napcat(context);
    if (!auth.can(user.id, scope.id, "fetch")) {
      return;
    }

    const url = match[2].trim();

    try {
      const response = await fetch(url);

      if (!response.ok) {
        await quick.reply(
          context,
          `请求失败: ${response.status} ${response.statusText}\n${url}`,
        );
        return;
      }

      const content_type = response.headers.get("content-type") || "";
      if (content_type.includes("application/json")) {
        try {
          const data = await response.json();
          await quick.reply(context, JSON.stringify(data, null, 2));
        } catch (error) {
          await quick.reply(
            context,
            `JSON解析失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else if (content_type.includes("text")) {
        try {
          const text = await response.text();
          await quick.reply(context, text);
        } catch (error) {
          await quick.reply(
            context,
            `文本解析失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        await quick.reply(context, `不支持的类型: ${content_type}`);
      }
    } catch (error) {
      await quick.reply(
        context,
        `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
};
