/// <reference types="node" />
import { Status } from './types';
import { BufferHandler } from './adapters/adapter';
import dgram = require('dgram');
/** Server Options */
export interface Options {
    type?: dgram.SocketType;
    port?: number;
    host?: string;
}
/** UDP server implementing LMTP */
export declare class Server {
    private socket;
    private messages;
    private listeners;
    private polling;
    constructor(options: Options);
    private getNext(key);
    private respondTo(port, host);
    /** Actually, set, not add */
    addListener(key: string, listener: BufferHandler): Status;
    removeListener(key: string): Status;
    startPolling(): Promise<void>;
    private poll(key, listener);
    stopPolling(): void;
}
