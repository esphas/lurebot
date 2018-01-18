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
const dgram = require("dgram");
/** UDP server implementing LMTP */
class Server {
    constructor(options) {
        this.messages = new Map;
        this.listeners = new Map;
        this.polling = false;
        this.socket = dgram.createSocket(options.type || 'udp4', (msg, rinfo) => __awaiter(this, void 0, void 0, function* () {
            console.info(`(;3) Received message: ${msg}`);
            let size = msg.readUInt8(0);
            let key = msg.toString('utf8', 1, size + 1);
            let queue = this.messages.get(key) || [];
            queue.push(msg.slice(size + 1));
            this.messages.set(key, queue);
            this.respondTo(rinfo.port, rinfo.address);
        }));
        this.socket.bind(options.port || 9743, options.host);
        console.info(`(;3) Server running at ${options.host}:${options.port}!`);
    }
    getNext(key) {
        return (this.messages.get(key) || []).shift();
    }
    respondTo(port, host) {
        this.socket.send(Buffer.from([0]), port, host);
    }
    /** Actually, set, not add */
    addListener(key, listener) {
        this.listeners.set(key, listener);
        return 0 /* Success */;
    }
    removeListener(key) {
        if (this.listeners.has(key)) {
            this.listeners.delete(key);
            return 0 /* Success */;
        }
        else {
            return 16 /* NonexistedKey */;
        }
    }
    startPolling() {
        return __awaiter(this, void 0, void 0, function* () {
            this.polling = true;
            let promises = [];
            for (const [key, listener] of this.listeners) {
                promises.push(this.poll(key, listener));
            }
            yield Promise.all(promises);
        });
    }
    poll(key, listener) {
        return __awaiter(this, void 0, void 0, function* () {
            let fetch = () => __awaiter(this, void 0, void 0, function* () {
                if (!this.polling) {
                    return;
                }
                let buffer = this.getNext(key);
                if (buffer) {
                    listener(buffer);
                }
                else {
                    yield new Promise((resolve) => setTimeout(resolve, 1000));
                }
                yield fetch();
            });
            yield fetch();
        });
    }
    stopPolling() {
        this.polling = false;
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map