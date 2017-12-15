/// <reference path="types.d.ts" />
import { Adapter } from './adapters/adapter';
export declare class Lurebot {
    private adapters;
    private port;
    private host;
    private server;
    private listeners;
    private messageQueue;
    private pollingInterval;
    private running;
    constructor(options?: LurebotOptions);
    readonly activeAdapters: Ker[];
    use(ker: Ker, adapter: Adapter): Promise<Status>;
    private installer(ker);
    remove(ker: Ker): Promise<Status>;
    private uninstaller(ker);
    private createServer();
    private startPolling();
    private fetchUpdate(ker, update);
    start(): Status;
    stop(): Status;
    hears(wind: Wind, ...rain: Drop[]): Status;
}
