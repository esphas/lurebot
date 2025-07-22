import { Command } from "../agent/command";

export const commands = [
  {
    event: "message",
    permission: "chat",
    name: "htkt|hitokoto|一言",
    pattern: "(.+)?",
    handler: async (context, match) => {
      const c =
        match![2]
          ?.split(",")
          .map((x) => `c=${x.trim()}`)
          .join("&") || "c=k";
      const response = await fetch(`https://v1.hitokoto.cn/?${c}&encode=json`);
      if (response.ok) {
        const data = await response.json();
        const hitokoto = data.hitokoto;
        const from = [data.from_who, data.from]
          .filter((x) => x != null)
          .join(" ")
          .trim();
        const text = `${hitokoto}${from ? `\n            ——${from}` : ""}`;
        await context.reply(text);
      } else {
        await context.reply("一言请求失败");
        await context.notify(
          `一言请求失败: ${response.status} ${response.statusText}\n${response.url}`,
        );
      }
    },
  } as Command<"message">,
] as Command[];
