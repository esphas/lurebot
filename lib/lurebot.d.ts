import * as Server from "./server";
import { Adapter } from "./adapters/adapter";
import { Processor } from "./processor";
export interface Options {
    server?: Server.Options;
}
export declare class Lurebot {
    private server?;
    private adapters;
    private processor;
    constructor(options?: Options);
    private createServer(options);
    plug(adapter: Adapter, key: string): Promise<Status>;
    private installer(key);
    unplug(key: string): Promise<Status>;
    private uninstaller(key);
    use(...processors: Processor[]): Status;
    private process;
    start(): Status;
    stop(): Status;
}
