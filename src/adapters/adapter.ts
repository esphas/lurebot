import { Status, StatusCode, BufferHandler } from '../types';
import { LooseProcessor } from '../processor';

export interface Installer {
  process: LooseProcessor;
  addListener(listener: BufferHandler): Status;
}

export interface Uninstaller {
  removeListener(): Status;
}

export abstract class Adapter {

  protected process?: LooseProcessor;
  async install(inst: Installer): Promise<Status> {
    if (this.process) {
      return { code: StatusCode.MultipleInstall };
    }
    this.process = inst.process;
    return { code: StatusCode.Success };
  };
  async uninstall(_uninst: Uninstaller): Promise<Status> {
    this.process = undefined;
    return { code: StatusCode.Success };
  };
  abstract start(): Status;
  abstract stop(): Status;
}
