import { Adapter } from "./adapter";

export class DebugAdapter extends Adapter {

  constructor() {
    console.log('Debug Adapter Constructor Called');
    super();
  }

  async install(_inst: Installer): Promise<Status> {
    console.log(`Debug Adapter install() called`);
    return Status.Success;
  }

  async uninstall(_uninst: Uninstaller): Promise<Status> {
    console.log(`Debug Adapter uninstall() called`);
    return Status.Success;
  }

  start(): Status {
    console.log(`Debug Adapter start() called`);
    return Status.Success;
  }

  stop(): Status {
    console.log(`Debug Adapter stop() called`);
    return Status.Success;
  }

  hears(_wind: Wind, ..._rain: Drop[]): Status {
    console.log(`Debug Adapter hears() called`);
    return Status.Success;
  }
}
