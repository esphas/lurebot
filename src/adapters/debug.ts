import { Status, StatusCode } from '../types';
import { Adapter, Installer, Uninstaller } from "./adapter";

export class DebugAdapter extends Adapter {
  private input: (string|number)[] = [];
  public output: string[] = [];
  private running = false;

  constructor() {
    super();
    console.log('Debug Adapter Constructor Called');
  }

  async install(_inst: Installer): Promise<Status> {
    console.log(`Debug Adapter install() called`);
    let code = StatusCode.Success;
    code |= (await super.install(_inst)).code;
    return { code };
  }

  async uninstall(_uninst: Uninstaller): Promise<Status> {
    console.log(`Debug Adapter uninstall() called`);
    let code = StatusCode.Success;
    code |= (await super.uninstall(_uninst)).code;
    return { code };
  }

  start(): Status {
    console.log(`Debug Adapter start() called`);
    this.running = true;
    this.poll();
    return { code: StatusCode.Success };
  }

  stop(): Status {
    console.log(`Debug Adapter stop() called`);
    this.running = false;
    return { code: StatusCode.Success };
  }

  write(...items: (string|number)[]) {
    for (const item of items) {
      this.input.push(item);
    }
  }

  private poll() {
    if (!this.running) {
      return;
    }
    if (!this.process) {
      return;
    }
    let timeout = 10;
    let item = this.input.shift();
    if (typeof item === 'string') {
      let reporter = {
        message: item,
        address: 'debug',
        reply: async (msg: string) => {
          this.output.push(msg);
          console.log(msg);
          return { code: StatusCode.Success };
        }
      };
      let identity = {
        uid: 0,
        addresses: ['debug'],
        auths: []
      };
      this.process(reporter, identity);
    } else if (typeof item === 'number') {
      timeout = item;
    }
    setTimeout(() => {
      this.poll();
    }, timeout);
  }
}
