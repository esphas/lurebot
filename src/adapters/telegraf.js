'use strict';

const Telegraf = require('telegraf');

const Adapter = require('./adapter');

module.exports = class TelegrafAdapter extends Adapter {

  constructor(token, options) {
    super();
    this._agent = new Telegraf(token, options);
  }

  async install(lurebot) {
    await this._agent.telegram.getMe().then((botInfo) => {
      this._agent.options.username = botInfo.username;
      console.info(`Telegraf 整装待发！用户名：${botInfo.username}`);
    });
  }

  async uninstall(lurebot) {
    this.stop();
    super.uninstall();
  }

  start() {
    this._agent.startPolling();
  }

  stop() {
    this._agent.stop();
  }

  hears(wind, ...rain) {
    let middleware = rain.map((drop) => {
      return (ctx, next) => {
        let reporter = {
          reply: ctx.reply
        };
        let identity = this.identityOf(/**/);
        let matched = ctx.message.text.match(wind);
        drop(reporter, identity, matched);
      };
    });
    this._agent.hears(wind, ...middleware);
  }

  identityOf(/**/) {
    return {
      todo: 'todo'
    };
  }
};
