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
class Server {
    constructor(options) {
        this.messages = new Map;
        this.listeners = new Map;
        this.polling = false;
        this.socket = dgram.createSocket(options.type || 'udp4', (msg, rinfo) => __awaiter(this, void 0, void 0, function* () {
            console.info('Received message:', msg);
            let size = msg.readUInt8(0);
            let key = msg.toString('utf8', 1, size + 1);
            let queue = this.messages.get(key) || [];
            queue.push(msg.slice(size + 1));
            this.messages.set(key, queue);
            this.respondTo(rinfo.port, rinfo.address);
        }));
        this.socket.bind(options.port || 9743, options.host);
    }
    getNext(key) {
        return (this.messages.get(key) || []).shift();
    }
    respondTo(port, host) {
        this.socket.send(Buffer.from([0]), port, host);
        return { code: 0 /* Success */ };
    }
    addListener(key, listener) {
        this.listeners.set(key, listener);
        return { code: 0 /* Success */ };
    }
    removeListener(key) {
        if (this.listeners.has(key)) {
            this.listeners.delete(key);
            return { code: 0 /* Success */ };
        }
        else {
            return { code: 16 /* NonexistedKey */ };
        }
    }
    startPolling() {
        let code = 0 /* Success */;
        for (const [key, listener] of this.listeners) {
            code |= this.poll(key, listener).code;
        }
        this.polling = true;
        return { code };
    }
    poll(key, listener) {
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
            fetch();
        });
        fetch();
        return { code: 0 /* Success */ };
    }
    stopPolling() {
        this.polling = false;
        return { code: 0 /* Success */ };
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map