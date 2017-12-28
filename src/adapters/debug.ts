import { Status, StatusCode } from '../types';
import { Adapter, Installer, Uninstaller } from './adapter';

export class DebugAdapter extends Adapter {
  private input: (string|number)[] = [];
  public output: string[] = [];
  private done: Function = () => {};
  private tasks: Promise<void>[] = [];
  private running = false;

  constructor() {
    super();
    console.log('🐶  Debug Adapter，构造！');
  }

  async install(_inst: Installer): Promise<Status> {
    console.log(`🐶  Debug Adapter，安装！`);
    let code = StatusCode.Success;
    code |= (await super.install(_inst)).code;
    return { code };
  }

  async uninstall(_uninst: Uninstaller): Promise<Status> {
    console.log(`🐶  Debug Adapter，卸载！`);
    let code = StatusCode.Success;
    code |= (await super.uninstall(_uninst)).code;
    return { code };
  }

  async start() {
    console.log(`🐶  Debug Adapter，启动！`);
    this.running = true;
    await this.poll();
  }

  stop() {
    console.log(`🐶  Debug Adapter，停止！`);
    this.running = false;
  }

  write(...items: (string|number)[]) {
    for (const item of items) {
      this.input.push(item);
    }
  }

  onAllProcessed(done: () => void) {
    this.done = done;
  }

  private async poll() {
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
          return { code: StatusCode.Success };
        }
      };
      let identity = {
        uid: 0,
        addresses: ['debug'],
        auths: []
      };
      this.tasks.push(this.process(reporter, identity));
    } else if (typeof item === 'number') {
      timeout = item;
    } else {
      await Promise.all(this.tasks);
      timeout = 0;
      this.done();
    }
    await new Promise((resolve) => setTimeout(resolve, timeout));
    await this.poll();
  }
}
