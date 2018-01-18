
declare module 'telegraf' {
  export = Telegraf;
  class Telegraf {
    constructor(token: string, options: Telegraf.Options);
    telegram: {
      getMe(): Promise<Telegraf.BotInfo>;
    };
    options: Telegraf.Options;
    startPolling(): void;
    stop(): void;
    use(...middlewares: Middleware[]): void;
  }
  interface Middleware {
    (ctx: Telegraf.Context, next: Function): void;
  }
  namespace Telegraf {
    export interface Options {
      username?: string;
    }
    export interface BotInfo {
      username: string;
    }
    export interface Context {
      message: string;
      reply(message: string): void;
    }
  }
}
