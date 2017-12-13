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
class DebugAdapter extends adapter_1.Adapter {
    constructor() {
        console.log('Debug Adapter Constructor Called');
        super();
    }
    install(_inst) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Debug Adapter install() called`);
            return 0 /* Success */;
        });
    }
    uninstall(_uninst) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Debug Adapter uninstall() called`);
            return 0 /* Success */;
        });
    }
    start() {
        console.log(`Debug Adapter start() called`);
        return 0 /* Success */;
    }
    stop() {
        console.log(`Debug Adapter stop() called`);
        return 0 /* Success */;
    }
    hears(_wind, ..._rain) {
        console.log(`Debug Adapter hears() called`);
        return 0 /* Success */;
    }
}
exports.DebugAdapter = DebugAdapter;
//# sourceMappingURL=debug.js.map