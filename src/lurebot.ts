import * as Server from './server';
import { Status } from './types';
import { Adapter, BufferHandler, Installer, Uninstaller } from './adapters/adapter';
import { Processor, Next } from './processor';
import { HKReporter, Reporter } from './reporter';
import { Identity } from './identity';

/** Lurebot Options */
export interface Options {
  server?: Server.Options;
}

/** Used for message text matching */
export type Wind = string | string[] | RegExp | RegExp[];
/** Handler */
export interface Drop {
  (reporter: HKReporter, identity: Identity): any;
}

/** Lurebot */
export class Lurebot {

  private server?: Server.Server;
  private adapters: Map<string, Adapter> = new Map;
  /** Head processor of the processing chain */
  private processor: Processor = (reporter, identity, next) => {
    console.info(`(;3) Received message "${ reporter.message }" from ${ identity.uid }@${ reporter.address }`);
    next();
  };

  constructor(options?: Options) {
    options = options || {};
    if (options.server) {
      this.createServer(options.server);
    }
    console.info(`(;3) Lurebot initialized!`);
  }

  private createServer(options: Server.Options) {
    this.server = new Server.Server(options);
  }

  /** Connect Lurebot and Adapter with the key */
  plug(adapter: Adapter, key: string): Status {
    if (this.adapters.get(key)) {
      return Status.OccupiedKey;
    }
    let status = adapter.install(this.installer(key));
    if (status === Status.Success) {
      this.adapters.set(key, adapter);
      console.info(`(;3) Adapter ${key} connected!`);
    } else {
      try {
        adapter.uninstall(this.uninstaller(key));
        console.info(`(;3) Adapter installing failed!`);
      } catch (err) {
        console.debug(err);
      }
    }
    return status;
  }

  /** Generate required Installer for adapters */
  private installer(key: string): Installer {
    return {
      key: key,
      process: this.process.bind(this),
      addListener: (() => {
        let executed = false;
        return (listener: BufferHandler): Status => {
          if (executed) {
            return Status.RepeatedCall;
          }
          executed = true;
          if (this.server) {
            return this.server.addListener(key, listener);
          } else {
            return Status.NoServer;
          }
        }
      })()
    };
  }

  /** Disconnect Adapter with key */
  unplug(key: string): Status {
    let adapter = this.adapters.get(key);
    if (adapter) {
      let status = adapter.uninstall(this.uninstaller(key));
      if (status === Status.Success) {
        this.adapters.delete(key);
        console.info(`(;3) Adapter ${key} disconnected!`);
      }
      return status;
    }
    return Status.NonexistedKey;
  }

  /** Generate required Uninstaller for adapters */
  private uninstaller(key: string): Uninstaller {
    return {
      key: key,
      removeListener: (() => {
        let executed = false;
        return (): Status => {
          if (executed) {
            return Status.RepeatedCall;
          }
          executed = true;
          if (this.server) {
            return this.server.removeListener(key);
          } else {
            return Status.NoServer;
          }
        }
      })()
    };
  }

  /** Use processors, appending to the end of the processing chain */
  use(...processors: Processor[]): Status {
    for (const processor of processors) {
      if (typeof processor !== 'function') {
        return Status.ArgumentError;
      }
      this.processor = compose(this.processor, processor);
    }
    return Status.Success;
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

  /** Promised processor */
  private async process(reporter: Reporter, identity: Identity, next: Next) {
    await new Promise((resolve) => {
      this.processor(reporter, identity, function (err) {
        next(err);
        resolve();
      });
    });
  }

  /** Start all and awaiting stop signal */
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

  /** Send stop signals */
  stop() {
    if (this.server) {
      this.server.stopPolling();
    }
    for (const adapter of this.adapters.values()) {
      adapter.stop();
    }
  }

  /** Basic hears, with no validation */
  hears(wind: Wind, ...rain: Drop[]) {
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
    };
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
  }
}
