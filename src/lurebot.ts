import * as Server from "./server";
import { Status, StatusCode, BufferHandler } from './types';
import { Adapter, Installer, Uninstaller } from "./adapters/adapter";
import { Processor, LooseProcessor } from "./processor";

export interface Options {
  server?: Server.Options
}

export class Lurebot {

  private server?: Server.Server;
  private adapters: Map<string, Adapter> = new Map;
  private processor: Processor = (reporter, identity, next) => {
    console.info(`🐶  Received message "${ reporter.message }" from ${ identity.uid }@${ reporter.address }`);
    next();
  };

  constructor(options?: Options) {
    options = options || {};
    if (options.server) {
      this.createServer(options.server);
    }
  }

  private createServer(options: Server.Options) {
    this.server = new Server.Server(options);
  }

  async plug(adapter: Adapter, key: string): Promise<Status> {
    if (this.adapters.get(key)) {
      return { code: StatusCode.OccupiedKey };
    }
    let status = await adapter.install(this.installer(key));
    if (status.code === StatusCode.Success) {
      this.adapters.set(key, adapter);
    } else {
      try {
        await adapter.uninstall(this.uninstaller(key));
      } catch (err) {
        console.debug(err);
      }
    }
    return status;
  }

  private installer(key: string): Installer {
    return {
      process: this.process,
      addListener: (() => {
        let executed = false;
        return (listener: BufferHandler): Status => {
          if (executed) {
            return { code: StatusCode.RepeatedCall };
          }
          executed = true;
          if (this.server) {
            return this.server.addListener(key, listener);
          } else {
            return { code: StatusCode.NoServer }
          }
        }
      })()
    };
  }

  async unplug(key: string): Promise<Status> {
    let adapter = this.adapters.get(key);
    if (adapter) {
      let status = await adapter.uninstall(this.uninstaller(key));
      if (status.code == StatusCode.Success) {
        this.adapters.delete(key);
      }
      return status;
    }
    return { code: StatusCode.NonexistedKey };
  }

  private uninstaller(key: string): Uninstaller {
    return {
      removeListener: (() => {
        let executed = false;
        return (): Status => {
          if (executed) {
            return { code: StatusCode.RepeatedCall };
          }
          executed = true;
          if (this.server) {
            return this.server.removeListener(key);
          } else {
            return { code: StatusCode.NoServer }
          }
        }
      })()
    };
  }

  use(...processors: Processor[]): Status {
    for (const processor of processors) {
      if (typeof processor !== 'function') {
        return { code: StatusCode.ArgumentError };
      }
      this.processor = compose(this.processor, processor);
    }
    return { code: StatusCode.Success };
    function compose(a: Processor, b: Processor): Processor {
      return (reporter, identity, next) => {
        a(reporter, identity, (err) => {
          if (err) {
            console.error(err);
            return { code: StatusCode.Unknown, ext: err };
          }
          return b(reporter, identity, next);
        });
      };
    };
  }

  private process: LooseProcessor = (reporter, identity, next) => {
    return this.processor(reporter, identity, next || function (err) {
      if (err) {
        console.error(err);
        return { code: StatusCode.Unknown };
      }
      return { code: StatusCode.Success };
    });
  }

  start(): Status {
    let code = StatusCode.Success;
    if (this.server) {
      code |= this.server.startPolling().code;
    }
    for (const adapter of this.adapters.values()) {
      code |= adapter.start().code;
    }
    return { code };
  }

  stop(): Status {
    let code = StatusCode.Success;
    if (this.server) {
      code |= this.server.stopPolling().code;
    }
    for (const adapter of this.adapters.values()) {
      code |= adapter.stop().code;
    }
    return { code };
  }
}
