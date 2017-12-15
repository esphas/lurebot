/// <reference types="node" />
interface LurebotOptions {
    port?: number;
    host?: string;
}
declare type Ker = string;
declare const enum Status {
    Success = 0,
    Unknown = 1,
    ArgumentError = 2,
    RepeatedCall = 4,
}
interface UpdateListener {
    (msg: Buffer): Status;
}
interface Installer {
    onUpdate(update: UpdateListener): Status;
}
interface Uninstaller {
    removeUpdate(): Status;
}
declare type Identity = any;
interface Reporter {
    reply(message: string): Promise<Status>;
}
interface Matched extends Array<string> {
    input: string;
}
declare type Wind = string | RegExp | string[] | RegExp[];
interface Drop {
    (reporter: Reporter, identity: Identity, matched: Matched): void;
}
