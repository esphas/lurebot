import dgram = require('dgram');

import Adapter from './adapters/adapter'

export default class Lurebot {

  private adapters: Map<Ker, Adapter> = new Map();
  private port: number = 9743;
  private host: string = '127.0.0.1';
  private server: dgram.Socket;
  private listeners: Map<Ker, UpdateListener>;
  private messageQueue: Map<Ker, Buffer[]>;

  constructor(options?: LurebotOptions) {
    options = options || {};
    this.port = options.port || this.port;
    this.host = options.host || this.host;
  }

  get activeAdapters() {
    return Array.from(this.adapters.keys());
  }

  async use(ker: Ker, adapter: Adapter): Promise<Status> {
    let prev = this.adapters.get(ker);
    if (prev) {
      console.warn('🙈欸？大圣，您怎么又来了？');
      await this.remove(ker);
    }
    this.adapters.set(ker, adapter);
    return await adapter.install(this.installer(ker));
  }

  private installer(ker: Ker): Installer {
    return {
      onUpdate: (() => {
        let executed = false;
        return (update: UpdateListener) => {
          if (executed) {
            throw new Error('贪心不足蛇吞象可还行 😏');
          } else {
            if (!this.server) {
              this.createServer();
            }
            this.listeners.set(ker, update)
          }
        };
      })()
    };
  }

  async remove(ker: Ker): Promise<Status> {
    let prev = this.adapters.get(ker);
    if (prev) {
      let ret = await prev.uninstall(this.uninstaller(ker));
      if (ret === 0/* Success */) {
        this.adapters.delete(ker);
      }
      return ret;
    } else {
      console.warn('对不起，您追杀的用户暂时不在服务区……');
      return -1; // ArgumentError
    }
  }

  private uninstaller(ker: Ker): Uninstaller {
    return {
      removeUpdate: (() => {
        let executed = false;
        return () => {
          if (executed) {
            throw new Error('贪心不足蛇吞象可还行 😏');
          } else {
            this.listeners.delete(ker);
          }
        };
      })()
    };
  }

  private createServer(): Status {
    this.listeners = new Map();
    this.server = dgram.createSocket('udp4', (msg, _rinfo) => {
      console.info(`Lurebot 收到消息：${ msg }`);
      let size = msg.readUInt8(0);
      let ker  = msg.toString('utf8', 1, size);
      let rest = msg.slice(size);
      let q = this.messageQueue.get(ker) || [];
      q.push(rest);  // lock?
      this.messageQueue.set(ker, q);
    });
    this.server.on('listening', () => {
      let address = this.server.address();
      console.info(`Lurebot 开始监听 ${ address.address }:${ address.port }~`);
    });
    this.server.on('close', () => {
      console.info('Lurebot 停止监听~');
    });
    this.server.bind(this.port, this.host);
    return 0;
  }

  start(): Status {
    let status = 0;
    for (const adapter of this.adapters.values()) {
      status = status || adapter.start();
    }
    return status;
  }

  stop(): Status {
    let status = 0;
    for (const adapter of this.adapters.values()) {
      status = status || adapter.stop();
    }
    return status;
  }

  hears(wind: Wind, ...rain: Drop[]): Status {
    let status = 0;
    for (const adapter of this.adapters.values()) {
      adapter.hears(wind, ...rain);
    }
    return status;
  }
}
