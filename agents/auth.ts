import { Command } from "../agent/command";
import { User } from "../auth/user";

export const commands = [
  {
    event: "message.private",
    permission: "any",
    symbol: "!",
    name: "admin",
    handler: async (context) => {
      const result = context.auth("always").auth.claim_admin(context.user.id);
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
        .auth("always")
        .group.from_napcat({ group_id: group_qq })!;
      if (is_add) {
        context.auth("root").group.register(group.id);
      } else {
        context.auth("root").group.unregister(group.id);
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
        .auth("always")
        .user.from_napcat({ user_id: user_qq })!;
      if (is_add) {
        context.auth("root").user.register(user.id);
      } else {
        context.auth("root").user.unregister(user.id);
      }
      await context.reply(`ok, 已${is_add ? "添加" : "移除"}用户 ${user.qq}`);
    },
  } as Command<"message">,
  {
    managed: false,
    event: "message",
    permission: "root",
    name: "group-all",
    pattern: "(add|allow|+|remove|deny|-)\\s*(\\d+)?",
    handler: async (context, match, app) => {
      const is_add = ["add", "allow", "+"].includes(match![1]);
      const group_qq = Number(match![2]);
      if (group_qq === 0 || isNaN(group_qq)) {
        await context.reply("无效的群号");
        return;
      }

      const napcat = app!.napcat;

      const members = (
        await napcat.get_group_member_list({
          group_id: group_qq,
        })
      ).map((member) =>
        context.auth("always").user.from_napcat({ user_id: member.user_id }),
      );
      const users: User[] = [];
      let success = 0;
      if (is_add) {
        for (const member of members) {
          users.push(...context.auth("root").user.register(member.id));
        }
        success = users.filter((user) => user.registered).length;
      } else {
        for (const member of members) {
          users.push(...context.auth("root").user.unregister(member.id));
        }
        success = users.filter((user) => !user.registered).length;
      }
      await context.reply(
        `ok, ${is_add ? "添加" : "移除"}群 ${group_qq} 中成员： ${success}/${members.length}`,
      );
    },
  } as Command<"message">,
  {
    event: "message",
    permission: "root",
    name: "trust|untrust",
    pattern: "(\\d+)",
    handler: async (context, match) => {
      const is_trust = match![1] === "trust";
      const user_qq = Number(match![2]);
      if (user_qq === 0 || isNaN(user_qq)) {
        await context.reply("无效的 QQ 号");
        return;
      }
      const user = context
        .auth("always")
        .user.from_napcat({ user_id: user_qq })!;
      const scope = context.scope;
      if (is_trust) {
        context.auth("root").auth.assign(user.id, scope.id, "trusted");
      } else {
        context.auth("root").auth.revoke(user.id, scope.id);
      }
      await context.reply(`ok, 已${is_trust ? "信任" : "取消信任"} ${user.qq}`);
    },
  } as Command<"message">,
  {
    managed: false,
    event: "message.group",
    permission: "any",
    symbol: "!",
    name: "register|unregister",
    handler: async (context, match, app) => {
      const is_register = match![1] === "register";
      const user = context.user;
      const group = context.group!;
      const auth = context.auth("always");
      if (!auth.group.is_registered(group.id)) {
        return;
      }
      if (is_register) {
        if (auth.user.is_registered(user.id)) {
          await context.reply("你已注册");
        } else {
          app!.auth.user.register(user.id);
          await context.reply("注册成功");
        }
      } else {
        if (auth.user.is_registered(user.id)) {
          app!.auth.user.unregister(user.id);
          await context.reply("注销成功");
        } else {
          await context.reply("你未注册");
        }
      }
    },
  } as Command<"message.group">,
  {
    managed: false,
    event: "message",
    permission: "chat",
    symbol: "!",
    name: "error_notify",
    pattern: "(on|off)?",
    handler: async (context, match, app) => {
      const user = context.user;
      const assign = match![2] === "on";
      app!.auth.user.update({ error_notify: assign }, { id: user.id });
      await context.reply(`错误通知已${assign ? "开启" : "关闭"}`);
    },
  } as Command<"message">,
] as Command[];
