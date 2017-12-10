'use strict';

const Adapter = require('./adapter');

module.exports = class CQAdapter extends Adapter {

  constructor() {
    super();
    this._running = false;
    this._triggers = new Map();
  }

  async install(lurebot, ker) {
    lurebot.addMessageListener(ker, (msg, rinfo, offset) => {
      if (this._running) {
        /**
         * msg ::=
         * ...header...| opr size | opr | rmsg |
         *      offset ^            rinfo.size ^
         */
        // todo
      }
    });
  }

  async uninstall(lurebot, ker) {
    lurebot.removeMessageListener(ker);
  }

  start() {
    this._running = true;
  }

  stop() {
    this._running = false;
  }

  hears(wind, ...rain) {
    if (!this._triggers.has(wind)) {
      this._triggers.set(wind, []);
    }
    for (const drop in rain) {
      this._triggers.get(wind).push(drop);
    }
  }
};
