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
class Adapter {
    install(inst) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.process) {
                return { code: 64 /* MultipleInstall */ };
            }
            this.process = inst.process;
            return { code: 0 /* Success */ };
        });
    }
    ;
    uninstall(_uninst) {
        return __awaiter(this, void 0, void 0, function* () {
            return { code: 0 /* Success */ };
        });
    }
    ;
}
exports.Adapter = Adapter;
//# sourceMappingURL=adapter.js.map