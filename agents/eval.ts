import { Agent } from "../agent";

export default async (agent: Agent) => {
  const { auth, quick } = agent.app;

  agent.on("message", async (context) => {
    const match = context.raw_message.match(/^!(eval)\s((?:.|\n)+)$/);
    if (!match) {
      return;
    }
    const { user } = auth.from_napcat(context);
    if (!auth.can(user.id, auth.scope.global().id, "root")) {
      return;
    }

    const script = match[2].trim();

    try {
      const func = new Function(script).bind(agent.app);
      const result = func();
      await quick.reply(context, result);
    } catch (error) {
      if (error instanceof Error) {
        await quick.reply(context, `Error: ${error.message} ${error.stack}`);
      } else {
        await quick.reply(context, `Error: ${error}`);
      }
    }
  });
};
