'use strict';

const Adapter = require('./adapters/adapter');

class Lurebot {

  constructor() {
    this._adapters = {};
  }

  get adapters() {
    return Object.getOwnPropertyNames(this._adapters);
  }

  async use(ker, adapter) {
    if (adapter instanceof Adapter) {
      if (this._adapters.hasOwnProperty(ker)) {
        console.warn('🙈欸？大圣，您怎么又来了？');
        this._adapters[ker].uninstall(this);
      }
      this._adapters[ker] = adapter;
      await adapter.install(this);
    } else {
      console.error('不要欺负人家啦！非要找些奇奇怪怪不认识的东西来干嘛啦！');
    }
  }

  async remove(ker) {
    if (this._adapters.hasOwnProperty(ker)) {
      await this._adapters[ker].uninstall(this);
      delete this._adapters[ker];
    } else {
      console.warn('对不起，您追杀的用户暂时不在服务区……');
    }
  }
}

for(const verb of ['start', 'stop', 'hears']) {
  Lurebot.prototype[verb] = function () {
    for (const ker in this._adapters) {
      this._adapters[ker][verb](...arguments);
    }
  };
}

module.exports = Lurebot;
