import { Adapter, Installer, Uninstaller } from "./adapter";

export class DebugAdapter extends Adapter {

  constructor() {
    console.log('Debug Adapter Constructor Called');
    super();
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
    return { code: StatusCode.Success };
  }

  stop(): Status {
    console.log(`Debug Adapter stop() called`);
    return { code: StatusCode.Success };
  }
}
