import { Logger } from "winston";
import { AllHandlers, EventKey } from "node-napcat-ts";

import { App } from "../app";
import { Command, CommandControl } from "./command";
import { create_context_napcat } from "./context";

export class Agent<T extends EventKey = EventKey> {
  private loaded: boolean = false;
  private commands: Map<string, [Required<Command<T>>, CommandControl]> =
    new Map();

  constructor(
    public app: App,
    public dir: string,
    public file: string,
    public logger: Logger,
  ) {}

  load_command(cmd: Command<T>) {
    this.unload_command(cmd.name);

    this.logger.log(
      "info",
      `[Agent: ${this.file}][Command: ${cmd.name}] Loading`,
    );

    const command: Required<Command<T>> = {
      managed: true,
      disabled: false,
      permission: "chat",
      symbol: "." as const,
      pattern: "",
      ...cmd,
    };

    const regex = command.pattern
      ? new RegExp(
          `^${command.symbol}(${command.name})\\s+${command.pattern}`,
          "i",
        )
      : new RegExp(`^${command.symbol}(${command.name})`, "i");
    const fn = async (ctx: AllHandlers[keyof AllHandlers]) => {
      if (!("self_id" in ctx) || !("user_id" in ctx)) {
        return;
      }
      if (command.disabled) {
        return;
      }
      if (ctx.post_type !== "message" && ctx.post_type !== "notice") {
        return;
      }
      const context = create_context_napcat<T>(this.app, ctx as AllHandlers[T]);
      if (context == null) {
        return;
      }
      let match: RegExpMatchArray | null = null;
      // match
      if (ctx.post_type === "message") {
        const first_message = ctx.message[0];
        if (first_message == null || first_message.type !== "text") {
          return;
        }
        const text = first_message.data.text;
        match = text.match(regex);
        if (match == null) {
          return;
        }
      } else if (ctx.post_type === "notice") {
        match = null;
      }
      // permission
      if (command.permission !== "any") {
        const { operator, permissions } =
          typeof command.permission === "string"
            ? { operator: "and", permissions: [command.permission] }
            : {
                operator: command.permission[0],
                permissions: command.permission.slice(1),
              };
        if (permissions.length === 0) {
          permissions.push("chat");
        }
        if (operator === "and") {
          if (
            permissions.some(
              (permission) =>
                !this.app.auth.can(
                  context.user.id,
                  context.scope.id,
                  permission,
                ),
            )
          ) {
            return;
          }
        } else if (operator === "or") {
          if (
            permissions.every(
              (permission) =>
                !this.app.auth.can(
                  context.user.id,
                  context.scope.id,
                  permission,
                ),
            )
          ) {
            return;
          }
        } else {
          this.logger.log(
            "warn",
            `[Agent: ${this.file}][Command: ${command.name}] Invalid permission operator: ${operator}`,
          );
          return;
        }
      }
      // handler
      try {
        await cmd.handler(context, match, command.managed ? null : this.app);
      } catch (error: unknown) {
        let message = "";
        if (error instanceof Error) {
          message = JSON.stringify(error);
        } else {
          message = String(error);
        }
        this.logger.log(
          "warn",
          `[Agent: ${this.file}][Command: ${command.name}] ${message}`,
        );
        context.notify(
          error instanceof Error ? error : new Error(String(error)),
        );
        control.unload();
      }
    };

    const control: CommandControl = {
      enable: () => {
        this.logger.log(
          "info",
          `[Agent: ${this.file}][Command: ${command.name}] Enabling`,
        );
        command.disabled = false;
      },
      disable: () => {
        this.logger.log(
          "info",
          `[Agent: ${this.file}][Command: ${command.name}] Disabling`,
        );
        command.disabled = true;
      },
      unload: () => {
        this.logger.log(
          "info",
          `[Agent: ${this.file}][Command: ${command.name}] Unloading`,
        );
        control.disable();
        this.app.napcat.off(cmd.event, fn);
        this.commands.delete(command.name);
      },
    };

    this.commands.set(command.name, [command, control]);
    this.app.napcat.on(cmd.event, fn);
  }

  unload_command(name: string) {
    if (this.commands.has(name)) {
      const [_, control] = this.commands.get(name)!;
      control.unload();
    }
  }

  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(_event: T, _fn: (ctx: any) => void) {}

  async reload() {
    await this.unload();
    this.logger.log("info", `Loading agent: ${this.file}`);
    try {
      this.loaded = true;
      const { commands } = await import(
        `../${this.dir}/${this.file}?t=${Date.now()}`
      );
      if (commands == null) {
        this.logger.log("warn", `Agent: ${this.file} has no commands`);
        return;
      }
      for (const command of commands) {
        this.load_command(command);
      }
    } catch (error) {
      this.logger.log("error", `Failed to load agent: ${this.file}`, error);
      this.unload();
    }
  }

  async unload() {
    if (!this.loaded) {
      return;
    }
    this.logger.log("info", `Unloading agent: ${this.file}`);
    this.commands.forEach(([_, control]) => {
      control.unload();
    });
    this.loaded = false;
  }
}
