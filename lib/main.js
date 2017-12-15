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
/// <reference path="./types.ts" />
const dgram = require("dgram");
class Lurebot {
    constructor(options) {
        this.adapters = new Map();
        this.port = 9743;
        this.host = '127.0.0.1';
        this.listeners = new Map();
        this.messageQueue = new Map();
        this.pollingInterval = 1000;
        this.running = false;
        options = options || {};
        this.port = options.port || this.port;
        this.host = options.host || this.host;
        this.createServer();
    }
    get activeAdapters() {
        return Array.from(this.adapters.keys());
    }
    use(ker, adapter) {
        return __awaiter(this, void 0, void 0, function* () {
            let prev = this.adapters.get(ker);
            if (prev) {
                console.warn('🙈欸？大圣，您怎么又来了？');
                yield this.remove(ker);
            }
            this.adapters.set(ker, adapter);
            return yield adapter.install(this.installer(ker));
        });
    }
    installer(ker) {
        return {
            onUpdate: (() => {
                let executed = false;
                return (update) => {
                    if (executed) {
                        return 4 /* RepeatedCall */;
                    }
                    else {
                        this.listeners.set(ker, update);
                        return 0 /* Success */;
                    }
                };
            })()
        };
    }
    remove(ker) {
        return __awaiter(this, void 0, void 0, function* () {
            let prev = this.adapters.get(ker);
            if (prev) {
                let ret = yield prev.uninstall(this.uninstaller(ker));
                if (ret === 0 /* Success */) {
                    this.adapters.delete(ker);
                }
                return ret;
            }
            else {
                console.warn('对不起，您追杀的用户暂时不在服务区……');
                return 2 /* ArgumentError */;
            }
        });
    }
    uninstaller(ker) {
        return {
            removeUpdate: (() => {
                let executed = false;
                return () => {
                    if (executed) {
                        return 4 /* RepeatedCall */;
                    }
                    else {
                        this.listeners.delete(ker);
                        return 0 /* Success */;
                    }
                };
            })()
        };
    }
    createServer() {
        this.server = dgram.createSocket('udp4', (msg, _rinfo) => {
            console.info(`Lurebot 收到消息：${msg}`);
            let size = msg.readUInt8(0);
            let ker = msg.toString('utf8', 1, size);
            let rest = msg.slice(size);
            let q = this.messageQueue.get(ker) || [];
            q.push(rest);
            this.messageQueue.set(ker, q);
        });
        this.server.on('listening', () => {
            let address = this.server.address();
            console.info(`Lurebot 开始监听 ${address.address}:${address.port}~`);
        });
        this.server.on('close', () => {
            console.info('Lurebot 停止监听~');
        });
        this.server.bind(this.port, this.host);
        return 0 /* Success */;
    }
    startPolling() {
        for (const [ker, update] of this.listeners) {
            this.fetchUpdate(ker, update);
        }
        return 0 /* Success */;
    }
    fetchUpdate(ker, update) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                return;
            }
            let q = this.messageQueue.get(ker);
            if (q) {
                let msg = q.shift();
                if (msg) {
                    yield update(msg);
                }
            }
            setTimeout(() => {
                this.fetchUpdate(ker, update);
            }, this.pollingInterval);
        });
    }
    start() {
        let status = 0 /* Success */;
        this.running = true;
        this.startPolling();
        for (const adapter of this.adapters.values()) {
            status |= adapter.start();
        }
        return status;
    }
    stop() {
        let status = 0 /* Success */;
        for (const adapter of this.adapters.values()) {
            status |= adapter.stop();
        }
        this.running = false;
        return status;
    }
    hears(wind, ...rain) {
        let status = 0 /* Success */;
        for (const adapter of this.adapters.values()) {
            status |= adapter.hears(wind, ...rain);
        }
        return status;
    }
}
exports.Lurebot = Lurebot;
//# sourceMappingURL=main.js.map