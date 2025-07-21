import {
  AllHandlers,
  EventKey,
  MessageHandler,
  NoticeHandler,
  Receive,
  SendMessageSegment,
  Structs,
} from "node-napcat-ts";
import cleanStack from "clean-stack";

import { App } from "../app";
import { Auth } from "../auth";
import { User, UserRepository } from "../auth/user";
import { Group, GroupRepository } from "../auth/group";
import { Scope, ScopeRepository } from "../auth/scope";
import { UserScopeRoleRepository } from "../auth/user_scope_role";

export interface CommonContext<T extends EventKey> {
  raw: AllHandlers[T];
  self: User;
  user: User;
  group: Group | null;
  scope: Scope;
  time: Date;
  auth: {
    user: UserRepository["safe_calls"];
    group: GroupRepository["safe_calls"];
    scope: ScopeRepository["safe_calls"];
    user_scope_role: UserScopeRoleRepository["safe_calls"];
  } & Auth["safe_calls"];
  notify(error: Error | string): Promise<void>;
  reply: (
    message: string | SendMessageSegment | SendMessageSegment[],
  ) => Promise<{ message_id: number }>;
  reply_poke: () => Promise<null>;
}

export interface MessageContext<T extends EventKey> extends CommonContext<T> {
  message: Receive[keyof Receive][];
}

export type NoticeContext<T extends EventKey> = CommonContext<T>;

export type Context<T extends EventKey> = MessageContext<T> | NoticeContext<T>;

export function create_context_napcat<T extends keyof MessageHandler>(
  app: App,
  napcat_ctx: MessageHandler[T],
): MessageContext<T>;
export function create_context_napcat<T extends keyof NoticeHandler>(
  app: App,
  napcat_ctx: NoticeHandler[T],
): NoticeContext<T> | null;
export function create_context_napcat<T extends keyof AllHandlers>(
  app: App,
  napcat_ctx: AllHandlers[T],
): Context<T> | null;
export function create_context_napcat<T extends keyof AllHandlers>(
  app: App,
  napcat_ctx: AllHandlers[T],
): Context<T> | null {
  if (!("self_id" in napcat_ctx) || !("user_id" in napcat_ctx)) {
    return null;
  }
  const self = app.auth.user.from_napcat({ user_id: napcat_ctx.self_id });
  const { user, group, scope } = app.auth.from_napcat(napcat_ctx);
  // for convenience
  const merged_target =
    "group_id" in napcat_ctx
      ? {
          user_id: napcat_ctx.user_id,
          group_id: napcat_ctx.group_id,
        }
      : {
          user_id: napcat_ctx.user_id,
        };
  const common: CommonContext<T> = {
    raw: napcat_ctx,
    self,
    user,
    group,
    scope,
    time: new Date(napcat_ctx.time),
    auth: {
      ...app.auth.safe_calls,
      user: app.auth.user.safe_calls,
      group: app.auth.group.safe_calls,
      scope: app.auth.scope.safe_calls,
      user_scope_role: app.auth.user_scope_role.safe_calls,
    },
    notify: async (error) => {
      const listeners = app.auth.get_error_notify_users(scope.id);
      if (listeners.length === 0) {
        return;
      }
      // TOOD: 优化报错展示
      const message: SendMessageSegment[] = [];
      if (error instanceof Error) {
        message.push(
          Structs.text(
            `${error.name}: ${error.message}\n${cleanStack(error.stack)}`,
          ),
        );
      } else {
        message.push(Structs.text(String(error)));
      }
      for (const listener of listeners) {
        if (listener.qq != null) {
          await app.napcat.send_msg({
            user_id: listener.qq,
            message,
          });
        }
      }
    },
    reply: async (msg) => {
      const message: SendMessageSegment[] = [];
      if ("message_id" in napcat_ctx) {
        message.push(Structs.reply(napcat_ctx.message_id));
      }
      if (typeof msg === "string") {
        message.push(Structs.text(msg));
      } else if (Array.isArray(msg)) {
        message.push(...msg);
      } else {
        message.push(msg);
      }
      return await app.napcat.send_msg({
        ...merged_target,
        message,
      });
    },
    reply_poke: async () => {
      return await app.napcat.send_poke(merged_target);
    },
  };
  if (napcat_ctx.post_type === "message") {
    return {
      ...common,
      message: napcat_ctx.message,
    } as MessageContext<T>;
  } else {
    return {
      ...common,
    } as NoticeContext<T>;
  }
}
