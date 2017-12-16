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
class Lurebot {
    constructor(options) {
        this.adapters = new Map;
        this.processor = (reporter, identity, next) => {
            console.info(`Received message ${reporter.message} from ${identity.uid}@${reporter.address}`);
            next();
        };
        this.process = (reporter, identity, next) => {
            return this.processor(reporter, identity, next || function (err) {
                if (err) {
                    console.error(err);
                    return { code: 1 /* Unknown */ };
                }
                return { code: 0 /* Success */ };
            });
        };
        options = options || {};
        if (options.server) {
            this.createServer(options.server);
        }
    }
    createServer(options) {
        this.server = new Server.Server(options);
    }
    plug(adapter, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.adapters.get(key)) {
                return { code: 8 /* OccupiedKey */ };
            }
            let status = yield adapter.install(this.installer(key));
            if (status.code === 0 /* Success */) {
                this.adapters.set(key, adapter);
            }
            return status;
        });
    }
    installer(key) {
        return {
            process: this.process,
            addListener: (() => {
                let executed = false;
                return (listener) => {
                    if (executed) {
                        return { code: 4 /* RepeatedCall */ };
                    }
                    executed = true;
                    if (this.server) {
                        return this.server.addListener(key, listener);
                    }
                    else {
                        return { code: 32 /* NoServer */ };
                    }
                };
            })()
        };
    }
    unplug(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let adapter = this.adapters.get(key);
            if (adapter) {
                let status = yield adapter.uninstall(this.uninstaller(key));
                if (status.code == 0 /* Success */) {
                    this.adapters.delete(key);
                }
                return status;
            }
            return { code: 16 /* NonexistedKey */ };
        });
    }
    uninstaller(key) {
        return {
            removeListener: (() => {
                let executed = false;
                return () => {
                    if (executed) {
                        return { code: 4 /* RepeatedCall */ };
                    }
                    executed = true;
                    if (this.server) {
                        return this.server.removeListener(key);
                    }
                    else {
                        return { code: 32 /* NoServer */ };
                    }
                };
            })()
        };
    }
    use(...processors) {
        for (const processor of processors) {
            if (typeof processor !== 'function') {
                return { code: 2 /* ArgumentError */ };
            }
            this.processor = compose(this.processor, processor);
        }
        return { code: 0 /* Success */ };
        function compose(a, b) {
            return (reporter, identity, next) => {
                a(reporter, identity, (err) => {
                    if (err) {
                        console.error(err);
                        return { code: 1 /* Unknown */, ext: err };
                    }
                    return b(reporter, identity, next);
                });
            };
        }
        ;
    }
    start() {
        let code = 0 /* Success */;
        if (this.server) {
            code |= this.server.startPolling().code;
        }
        for (const adapter of this.adapters.values()) {
            code |= adapter.start().code;
        }
        return { code };
    }
    stop() {
        let code = 0 /* Success */;
        if (this.server) {
            code |= this.server.stopPolling().code;
        }
        for (const adapter of this.adapters.values()) {
            code |= adapter.stop().code;
        }
        return { code };
    }
}
exports.Lurebot = Lurebot;
//# sourceMappingURL=lurebot.js.map