/// <reference types="node" />
import { Status } from '../types';
import { PromisedProcessor } from '../processor';
export interface BufferHandler {
    (msg: Buffer): Status;
}
export interface Installer {
    process: PromisedProcessor;
    addListener(listener: BufferHandler): Status;
}
export interface Uninstaller {
    removeListener(): Status;
}
/** Handling Buffer */
export declare abstract class Adapter {
    protected process?: PromisedProcessor;
    install(inst: Installer): Status;
    uninstall(_uninst: Uninstaller): Status;
    abstract start(): Promise<void>;
    abstract stop(): void;
}
