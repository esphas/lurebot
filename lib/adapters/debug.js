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
const adapter_1 = require("./adapter");
const reporter_1 = require("../reporter");
class DebugAdapter extends adapter_1.Adapter {
    constructor() {
        super();
        this.input = [];
        this.output = [];
        this.done = () => { };
        this.tasks = [];
        this.running = false;
        console.log('(;3) Debug Adapter，构造！');
    }
    install(inst) {
        console.log(`(;3) Debug Adapter，安装！`);
        return super.install(inst);
    }
    uninstall(uninst) {
        console.log(`(;3) Debug Adapter，卸载！`);
        return super.uninstall(uninst);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`(;3) Debug Adapter，启动！`);
            this.running = true;
            yield this.poll();
        });
    }
    stop() {
        console.log(`(;3) Debug Adapter，停止！`);
        this.running = false;
    }
    write(...items) {
        for (const item of items) {
            this.input.push(item);
        }
    }
    onAllProcessed(done) {
        this.done = done;
    }
    poll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                return;
            }
            if (!this.process) {
                return;
            }
            let timeout = 10;
            let item = this.input.shift();
            if (typeof item === 'string') {
                let reporter = reporter_1.hireReporter({
                    message: item,
                    address: 'debug',
                    reply: (msg) => __awaiter(this, void 0, void 0, function* () {
                        this.output.push(msg);
                        return 0 /* Success */;
                    })
                });
                let identity = {
                    uid: 0,
                    addresses: ['debug'],
                    auths: []
                };
                this.tasks.push(this.process(reporter, identity, () => 0));
            }
            else if (typeof item === 'number') {
                timeout = item;
            }
            else {
                yield Promise.all(this.tasks);
                timeout = 0;
                this.done();
            }
            yield new Promise((resolve) => setTimeout(resolve, timeout));
            yield this.poll();
        });
    }
}
exports.DebugAdapter = DebugAdapter;
//# sourceMappingURL=debug.js.map