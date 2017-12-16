/// <reference types="node" />
import dgram = require('dgram');
export interface Options {
    type?: dgram.SocketType;
    port?: number;
    host?: string;
}
export declare class Server {
    private socket;
    private messages;
    private listeners;
    private polling;
    constructor(options: Options);
    private getNext(key);
    private respondTo(port, host);
    addListener(key: string, listener: BufferHandler): Status;
    removeListener(key: string): Status;
    startPolling(): Status;
    private poll(key, listener);
    stopPolling(): Status;
}
