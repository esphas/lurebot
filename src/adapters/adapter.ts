import { Status } from '../types';
import { PromisedProcessor } from '../processor';

/** Handling Buffer, will be added as a listener in Server */
export interface BufferHandler {
  (msg: Buffer): Status;
}

export interface Installer {
  key: string,
  process: PromisedProcessor;
  addListener(listener: BufferHandler): Status;
}

export interface Uninstaller {
  key: string,
  removeListener(): Status;
}

export abstract class Adapter {

  protected key?: string;
  protected process?: PromisedProcessor;
  install(inst: Installer): Status {
    if (this.key) {
      return Status.MultipleInstall;
    }
    this.key = inst.key;
    this.process = inst.process;
    return Status.Success;
  };
  uninstall(_uninst: Uninstaller): Status {
    this.stop();
    this.key = undefined;
    this.process = undefined;
    return Status.Success;
  };
  abstract async start(): Promise<void>;
  abstract stop(): void;
}
