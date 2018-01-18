import * as Server from './server';
import { Status } from './types';
import { Adapter } from "./adapters/adapter";
import { Processor } from './processor';
import { HKReporter } from './reporter';
import { Identity } from './identity';
/** Lurebot Options */
export interface Options {
    server?: Server.Options;
}
/** Used for message text matching */
export declare type Wind = string | string[] | RegExp | RegExp[];
/** Handler */
export interface Drop {
    (reporter: HKReporter, identity: Identity): any;
}
/** Lurebot */
export declare class Lurebot {
    private server?;
    private adapters;
    /** Head processor of the processing chain */
    private processor;
    constructor(options?: Options);
    private createServer(options);
    /** Connect Lurebot and Adapter with the key */
    plug(adapter: Adapter, key: string): Status;
    /** Generate required Installer for adapters */
    private installer(key);
    /** Disconnect Adapter with key */
    unplug(key: string): Status;
    /** Generate required Uninstaller for adapters */
    private uninstaller(key);
    /** Use processors, appending to the end of the processing chain */
    use(...processors: Processor[]): Status;
    /** Promised processor */
    private process(reporter, identity, next);
    /** Start all and awaiting stop signal */
    start(): Promise<void>;
    /** Send stop signals */
    stop(): void;
    /** Basic hears, with no validation */
    hears(wind: Wind, ...rain: Drop[]): void;
}
