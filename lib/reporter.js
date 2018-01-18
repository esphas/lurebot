"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
function hireReporter(witness) {
    return Object.assign({}, witness, { fetch: node_fetch_1.default });
}
exports.hireReporter = hireReporter;
//# sourceMappingURL=reporter.js.map