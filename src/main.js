'use strict';

const dgram = require('dgram');

const Adapter = require('./adapters/adapter');

class Lurebot {

  constructor(options) {
    this._adapters = {};
    this._port = options.port || 9743;
    this._host = options.host || '127.0.0.1';
  }

  get adapters() {
    return Object.getOwnPropertyNames(this._adapters);
  }

  async use(ker, adapter) {
    if (adapter instanceof Adapter) {
      if (this._adapters.hasOwnProperty(ker)) {
        console.warn('🙈欸？大圣，您怎么又来了？');
        this._adapters[ker].uninstall(this, ker);
      }
      this._adapters[ker] = adapter;
      await adapter.install(this, ker);
    } else {
      console.error('不要欺负人家啦！非要找些奇奇怪怪不认识的东西来干嘛啦！');
    }
  }

  async remove(ker) {
    if (this._adapters.hasOwnProperty(ker)) {
      await this._adapters[ker].uninstall(this, ker);
      delete this._adapters[ker];
    } else {
      console.warn('对不起，您追杀的用户暂时不在服务区……');
    }
  }

  createServer() {
    if (this._server instanceof dgram.Socket) {
      this._server.close();
    }
    this._server = dgram.createSocket('udp4');
    this._listeners = {};
    this._server.on('listening', () => {
      let address = this._server.address();
      console.info(`Lurebot 开始监听 ${address.address}:${address.port}~`);
    });
    this._server.on('close', () => {
      console.info('Lurebot 停止监听~');
    });
    this._server.bind(this._port, this._host);
  }

  addMessageListener(ker, listener) {
    if (!this._server) {
      this.createServer();
    }
    if (this._listeners[ker]) {
      console.warn('同一个 Listener, 同一个 Adapter！');
      this.removeMessageListener(ker);
    }
    this._listeners[ker] = (msg, rinfo) => {
      console.debug('lurebot.server.on message:', msg);
      let offset = 0;
      let sz     = msg.readInt8(offset);
      offset    += 1;
      let rker   = msg.toString('utf8', offset, offset + sz);
      if (ker === rker) {
        listener(msg, rinfo, offset);
      }
    };
    this._server.on('message', this._listeners[ker]);
  }

  removeMessageListener(ker) {
    this._server.removeListener('message', this._listeners[ker]);
    delete this._listeners[ker];
  }
}

for (const verb of ['start', 'stop', 'hears']) {
  Lurebot.prototype[verb] = function () {
    for (const ker in this._adapters) {
      this._adapters[ker][verb](...arguments);
    }
  };
}

module.exports = Lurebot;
