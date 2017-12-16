import { Adapter, Installer, Uninstaller } from "./adapter";
export declare class DebugAdapter extends Adapter {
    constructor();
    install(_inst: Installer): Promise<Status>;
    uninstall(_uninst: Uninstaller): Promise<Status>;
    start(): Status;
    stop(): Status;
}
