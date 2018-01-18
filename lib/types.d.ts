export declare const enum Status {
    Success = 0,
    Unknown = 1,
    ArgumentError = 2,
    RepeatedCall = 4,
    OccupiedKey = 8,
    NonexistedKey = 16,
    NoServer = 32,
    MultipleInstall = 64,
}
export declare type Maybe<T> = T | void | null | undefined;
