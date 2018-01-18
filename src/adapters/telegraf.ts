import { Adapter, Installer } from './adapter';
import Telegraf = require('telegraf');
import { Status } from '../types';
import { hireReporter } from '../reporter';

export class TelegrafAdapter extends Adapter {

  private agent: Telegraf;

  constructor(token: string, options: Telegraf.Options) {
    super();
    this.agent = new Telegraf(token, options);
  }

  install(inst: Installer): Status {
    this.agent.telegram.getMe().then((botInfo) => {
      this.agent.options.username = botInfo.username;
    });
    this.agent.use((ctx, next) => {
      if (this.process) {
        let reporter = hireReporter({
          message: ctx.message,
          address: this.key || 'telegraf',
          identity: {
            //todo
            uid: 0,
            name: 'ghost',
            addresses: ['telegraf'],
            anonymous: false
          },
          position: {
            pid: 0,
            private: false
          },
          reply: async (message) => { ctx.reply(message); return Status.Success; }
        });
        this.process(reporter, reporter.identity, (err)=>err);
      }
      next();
    });
    return super.install(inst);
  }

  async start() {
    this.agent.startPolling();
  }

  stop() {
    this.agent.stop();
  }
}
