"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Handling Buffer */
class Adapter {
    install(inst) {
        if (this.process) {
            return 64 /* MultipleInstall */;
        }
        this.process = inst.process;
        return 0 /* Success */;
    }
    ;
    uninstall(_uninst) {
        this.process = undefined;
        return 0 /* Success */;
    }
    ;
}
exports.Adapter = Adapter;
//# sourceMappingURL=adapter.js.map