import * as Server from './server';
import { Status, StatusCode, BufferHandler } from './types';
import { Adapter, Installer, Uninstaller } from "./adapters/adapter";
import { Processor, Next } from './processor';
import { HKReporter, Reporter } from './reporter';
import { Identity } from './identity';

export interface Options {
  server?: Server.Options
}

export type Wind = string | string[] | RegExp | RegExp[];
export interface Drop {
  (reporter: HKReporter, identity: Identity): any
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
      process: this.process.bind(this),
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
            throw err;
          }
          b(reporter, identity, next);
        });
      };
    };
  }

  private async process(reporter: Reporter, identity: Identity, next?: Next) {
    await new Promise((resolve) => {
      this.processor(reporter, identity, function (err) {
        (next || function (err) {
          if (err) {
            console.error(err);
            throw err;
          }
        })(err);
        resolve();
      });
    });
  }

  async start() {
    let promises = [];
    if (this.server) {
      promises.push(this.server.startPolling());
    }
    for (const adapter of this.adapters.values()) {
      promises.push(adapter.start());
    }
    await Promise.all(promises);
  }

  stop() {
    if (this.server) {
      this.server.stopPolling();
    }
    for (const adapter of this.adapters.values()) {
      adapter.stop();
    }
  }

  hears(wind: Wind, ...rain: Drop[]): Status {
    let code = StatusCode.Success;
    let winds: (string|RegExp)[];
    if (typeof wind === 'string' || wind instanceof RegExp) {
      winds = [wind];
    } else {
      winds = wind;
    }
    let match = (message: string) => {
      let result = null;
      for (const wind of winds) {
        result = message.match(wind);
        if (result) {
          break;
        }
      }
      return result;
    }
    this.use((reporter, identity, next) => {
      let promises = [];
      let result = match(reporter.message);
      if (result) {
        let hkreporter = Object.assign({}, reporter, { matched: result as RegExpMatchArray });
        for (const drop of rain) {
          promises.push(drop(hkreporter, identity));
        }
      }
      Promise.all(promises).then(() => next());
    });
    return { code };
  }
}
