import { Status, StatusCode, BufferHandler } from './types';
import dgram = require('dgram');

export interface Options {
  type?: dgram.SocketType,
  port?: number,
  host?: string
}

export class Server {

  private socket: dgram.Socket;
  private messages: Map<string, Buffer[]> = new Map;
  private listeners: Map<string, BufferHandler> = new Map;
  private polling = false;

  constructor(options: Options) {
    this.socket = dgram.createSocket(options.type || 'udp4', async (msg, rinfo) => {
      console.info('Received message:', msg);
      let size = msg.readUInt8(0);
      let key = msg.toString('utf8', 1, size + 1);
      let queue = this.messages.get(key) || [];
      queue.push(msg.slice(size + 1));
      this.messages.set(key, queue);
      this.respondTo(rinfo.port, rinfo.address);
    });
    this.socket.bind(options.port || 9743, options.host);
  }

  private getNext(key: string): Buffer | undefined {
    return (this.messages.get(key) || []).shift();
  }

  private respondTo(port: number, host: string): Status {
    this.socket.send(Buffer.from([0]), port, host);
    return { code: StatusCode.Success };
  }

  addListener(key: string, listener: BufferHandler): Status {
    this.listeners.set(key, listener);
    return { code: StatusCode.Success };
  }

  removeListener(key: string): Status {
    if (this.listeners.has(key)) {
      this.listeners.delete(key);
      return { code: StatusCode.Success };
    } else {
      return { code: StatusCode.NonexistedKey };
    }
  }

  async startPolling() {
    this.polling = true;
    let promises = [];
    for (const [key, listener] of this.listeners) {
      promises.push(this.poll(key, listener));
    }
    await Promise.all(promises);
  }

  private async poll(key: string, listener: BufferHandler) {
    let fetch = async () => {
      if (!this.polling) {
        return;
      }
      let buffer = this.getNext(key);
      if (buffer) {
        listener(buffer);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await fetch();
    };
    await fetch();
  }

  stopPolling() {
    this.polling = false;
  }
}
