import { LooseProcessor } from "../processor";
export interface Installer {
    process: LooseProcessor;
    addListener(listener: BufferHandler): Status;
}
export interface Uninstaller {
    removeListener(): Status;
}
export declare abstract class Adapter {
    private process;
    install(inst: Installer): Promise<Status>;
    uninstall(_uninst: Uninstaller): Promise<Status>;
    abstract start(): Status;
    abstract stop(): Status;
}
