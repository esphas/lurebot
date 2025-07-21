import { Agent } from "../agent";
import { Command } from "../agent/command";

export default async (agent: Agent) => {
  const { auth, quick } = agent.app;

  agent.on("message", async (context) => {
    const match = context.raw_message.match(/^!(trust|untrust)\s*(\d+)\s*$/);
    if (!match) {
      return;
    }
    const { user, scope } = auth.from_napcat(context);
    if (!auth.can(user.id, scope.id, "moderate")) {
      return;
    }

    const trust = match[1] === "trust";
    const user_qq = Number(match[2]);
    const new_user = auth.user.from_napcat({ user_id: user_qq });
    if (trust) {
      auth.assign(new_user.id, scope.id, "trusted");
    } else {
      auth.revoke(new_user.id, scope.id);
    }
    await quick.reply(
      context,
      `ok, ${trust ? "信任" : "取消信任"} ${new_user.qq}`,
    );
  });

  agent.on("message.group", async (context) => {
    const match = context.raw_message.match(/^!(register|unregister)\s*$/);
    if (!match) {
      return;
    }
    const { user, group } = auth.from_napcat(context);
    if (!auth.group.is_registered(group!.id)) {
      return;
    }

    const command = match[1];
    if (command === "register") {
      if (auth.user.is_registered(user.id)) {
        await quick.reply(context, "你已注册");
      } else {
        auth.user.register(user.id);
        await quick.reply(context, "注册成功");
      }
    } else {
      if (auth.user.is_registered(user.id)) {
        auth.user.unregister(user.id);
        await quick.reply(context, "注销成功");
      } else {
        await quick.reply(context, "你未注册");
      }
    }
  });

  agent.on("message", async (context) => {
    const match = context.raw_message.match(/^!(error_notify)\s*(on|off)?\s*$/);
    if (!match) {
      return;
    }
    const { user } = auth.from_napcat(context);
    if (!auth.user.is_registered(user.id)) {
      return;
    }

    const assign = match[2] === "on";
    auth.user.update({ error_notify: assign }, { id: user.id });
    await quick.reply(context, `错误通知已${assign ? "开启" : "关闭"}`);
  });
};

export const commands = [
  {
    event: "message.private",
    symbol: "!",
    name: "admin",
    handler: async (context) => {
      const result = context.auth<"always">().auth.claim_admin(context.user.id);
      if (result) {
        await context.reply("你已获得管理员权限");
      } else {
        await context.reply("管理员已存在");
      }
    },
  } as Command<"message.private">,
  {
    event: "message",
    permission: "root",
    name: "group",
    pattern: "(add|allow|+|remove|deny|-)\\s*(\\d+)?",
    handler: async (context, match) => {
      const is_add = ["add", "allow", "+"].includes(match![1]);
      const group_qq = Number(match![2]);
      if (group_qq === 0 || isNaN(group_qq)) {
        await context.reply("无效的群号");
        return;
      }
      const group = context
        .auth<"always">()
        .group.from_napcat({ group_id: group_qq })!;
      if (is_add) {
        context.auth<"root">().group.register(group.id);
      } else {
        context.auth<"root">().group.unregister(group.id);
      }
      await context.reply(`ok, 已${is_add ? "添加" : "移除"}群 ${group.qq}`);
    },
  } as Command<"message">,
  {
    event: "message",
    permission: "root",
    name: "user",
    pattern: "(add|allow|+|remove|deny|-)\\s*(\\d+)?",
    handler: async (context, match) => {
      const is_add = ["add", "allow", "+"].includes(match![1]);
      const user_qq = Number(match![2]);
      if (user_qq === 0 || isNaN(user_qq)) {
        await context.reply("无效的 QQ 号");
        return;
      }
      const user = context
        .auth<"always">()
        .user.from_napcat({ user_id: user_qq })!;
      if (is_add) {
        context.auth<"root">().user.register(user.id);
      } else {
        context.auth<"root">().user.unregister(user.id);
      }
      await context.reply(`ok, 已${is_add ? "添加" : "移除"}用户 ${user.qq}`);
    },
  } as Command<"message">,
  // {
  //   event: "message",
  //   permission: "root",
  //   name: "group-all",
  //   pattern: "(add|allow|+|remove|deny|-)\\s*(\\d+)?",
  //   handler: async (context, match) => {
  //     const is_add = ["add", "allow", "+"].includes(match![1]);
  //     let group_qq = Number(match![2]);
  //     if (group_qq === 0 || isNaN(group_qq)) {
  //       await context.reply("无效的群号");
  //       return;
  //     }
  //     // TODO: 暴露 napcat.get_group_member_list

  // const members = (
  //   await napcat.get_group_member_list({
  //     group_id: group_qq,
  //   })
  // ).map((member) => auth.user.from_napcat({ user_id: member.user_id }));
  // const users: User[] = [];
  // let success = 0;
  // if (command === "add") {
  //   for (const member of members) {
  //     users.push(...auth.user.register(member.id));
  //   }
  //   success = users.filter((user) => user.registered).length;
  // } else {
  //   for (const member of members) {
  //     users.push(...auth.user.unregister(member.id));
  //   }
  //   success = users.filter((user) => !user.registered).length;
  // }
  // await quick.reply(
  //   context,
  //   `ok, ${command} ${group_qq} ${success}/${members.length}`,
  // );

  //   },
  // } as Command<"message">,
] as Command[];
