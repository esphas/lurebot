import { Adapter } from "./adapter";
export declare class DebugAdapter extends Adapter {
    constructor();
    install(_inst: Installer): Promise<Status>;
    uninstall(_uninst: Uninstaller): Promise<Status>;
    start(): Status;
    stop(): Status;
    hears(_wind: Wind, ..._rain: Drop[]): Status;
}
