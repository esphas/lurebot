"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Server = require("./server");
/** Lurebot */
class Lurebot {
    constructor(options) {
        this.adapters = new Map;
        /** Head processor of the processing chain */
        this.processor = (reporter, identity, next) => {
            console.info(`(;3) Received message "${reporter.message}" from ${identity.uid}@${reporter.address}`);
            next();
        };
        options = options || {};
        if (options.server) {
            this.createServer(options.server);
        }
        console.info(`(;3) Lurebot initialized!`);
    }
    createServer(options) {
        this.server = new Server.Server(options);
    }
    /** Connect Lurebot and Adapter with the key */
    plug(adapter, key) {
        if (this.adapters.get(key)) {
            return 8 /* OccupiedKey */;
        }
        let status = adapter.install(this.installer(key));
        if (status === 0 /* Success */) {
            this.adapters.set(key, adapter);
            console.info(`(;3) Adapter ${key} connected!`);
        }
        else {
            try {
                adapter.uninstall(this.uninstaller(key));
                console.info(`(;3) Adapter installing failed!`);
            }
            catch (err) {
                console.debug(err);
            }
        }
        return status;
    }
    /** Generate required Installer for adapters */
    installer(key) {
        return {
            process: this.process.bind(this),
            addListener: (() => {
                let executed = false;
                return (listener) => {
                    if (executed) {
                        return 4 /* RepeatedCall */;
                    }
                    executed = true;
                    if (this.server) {
                        return this.server.addListener(key, listener);
                    }
                    else {
                        return 32 /* NoServer */;
                    }
                };
            })()
        };
    }
    /** Disconnect Adapter with key */
    unplug(key) {
        let adapter = this.adapters.get(key);
        if (adapter) {
            let status = adapter.uninstall(this.uninstaller(key));
            if (status === 0 /* Success */) {
                this.adapters.delete(key);
                console.info(`(;3) Adapter ${key} disconnected!`);
            }
            return status;
        }
        return 16 /* NonexistedKey */;
    }
    /** Generate required Uninstaller for adapters */
    uninstaller(key) {
        return {
            removeListener: (() => {
                let executed = false;
                return () => {
                    if (executed) {
                        return 4 /* RepeatedCall */;
                    }
                    executed = true;
                    if (this.server) {
                        return this.server.removeListener(key);
                    }
                    else {
                        return 32 /* NoServer */;
                    }
                };
            })()
        };
    }
    /** Use processors, appending to the end of the processing chain */
    use(...processors) {
        for (const processor of processors) {
            if (typeof processor !== 'function') {
                return 2 /* ArgumentError */;
            }
            this.processor = compose(this.processor, processor);
        }
        return 0 /* Success */;
        function compose(a, b) {
            return (reporter, identity, next) => {
                a(reporter, identity, (err) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }
                    b(reporter, identity, next);
                });
            };
        }
        ;
    }
    /** Promised processor */
    process(reporter, identity, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve) => {
                this.processor(reporter, identity, function (err) {
                    next(err);
                    resolve();
                });
            });
        });
    }
    /** Start all and awaiting stop signal */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = [];
            if (this.server) {
                promises.push(this.server.startPolling());
            }
            for (const adapter of this.adapters.values()) {
                promises.push(adapter.start());
            }
            yield Promise.all(promises);
        });
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
    hears(wind, ...rain) {
        let winds;
        if (typeof wind === 'string' || wind instanceof RegExp) {
            winds = [wind];
        }
        else {
            winds = wind;
        }
        let match = (message) => {
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
                let hkreporter = Object.assign({}, reporter, { matched: result });
                for (const drop of rain) {
                    promises.push(drop(hkreporter, identity));
                }
            }
            Promise.all(promises).then(() => next());
        });
    }
}
exports.Lurebot = Lurebot;
//# sourceMappingURL=lurebot.js.map