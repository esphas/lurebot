import { Status } from '../types';
import { Adapter, Installer, Uninstaller } from './adapter';
export declare class DebugAdapter extends Adapter {
    private input;
    output: string[];
    private done;
    private tasks;
    private running;
    constructor();
    install(inst: Installer): Status;
    uninstall(uninst: Uninstaller): Status;
    start(): Promise<void>;
    stop(): void;
    write(...items: (string | number)[]): void;
    onAllProcessed(done: () => void): void;
    private poll();
}
