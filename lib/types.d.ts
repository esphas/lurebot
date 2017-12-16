/// <reference types="node" />
interface Status {
    code: StatusCode;
    ext?: any;
}
declare const enum StatusCode {
    Success = 0,
    Unknown = 1,
    ArgumentError = 2,
    RepeatedCall = 4,
    OccupiedKey = 8,
    NonexistedKey = 16,
    NoServer = 32,
    MultipleInstall = 64,
}
interface BufferHandler {
    (msg: Buffer): Status;
}
declare type Maybe<T> = T | void | null | undefined;
