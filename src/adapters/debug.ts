import { Status } from '../types';
import { Adapter, Installer, Uninstaller } from './adapter';
import { hireReporter } from '../reporter';
import { Identity, Position } from '../identity';

export type DebugInput = InputMessage | number;
export interface InputMessage {
  message: string;
  identity: Identity;
  position: Position;
}

export class DebugAdapter extends Adapter {
  private input: DebugInput[] = [];
  public output: string[] = [];
  private done: Function = () => {};
  private tasks: Promise<void>[] = [];
  private running = false;

  constructor() {
    super();
    console.log('(;3) Debug Adapter，构造！');
  }

  install(inst: Installer): Status {
    console.log(`(;3) Debug Adapter，安装！`);
    return super.install(inst);
  }

  uninstall(uninst: Uninstaller): Status {
    console.log(`(;3) Debug Adapter，卸载！`);
    return super.uninstall(uninst);
  }

  async start() {
    console.log(`(;3) Debug Adapter，启动！`);
    this.running = true;
    await this.poll();
  }

  stop() {
    console.log(`(;3) Debug Adapter，停止！`);
    this.running = false;
  }

  write(...items: DebugInput[]) {
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
    if (typeof item === 'number') {
      timeout = item;
    } else if (typeof item === 'undefined') {
      await Promise.all(this.tasks);
      timeout = 0;
      this.done();
    } else {
      let reporter = hireReporter({
        message: item.message,
        address: this.key || 'debug',
        reply: async (msg: string) => {
          this.output.push(msg);
          return Status.Success;
        },
        identity: item.identity,
        position: item.position
      });
      this.tasks.push(this.process(reporter, reporter.identity, (err)=>err));
    }
    await new Promise((resolve) => setTimeout(resolve, timeout));
    await this.poll();
  }
}
