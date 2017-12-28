
export interface Status {
  code: StatusCode;
  ext?: any
}

export const enum StatusCode {
  Success           = 0,
  Unknown           = 1 << 0,
  ArgumentError     = 1 << 1,
  RepeatedCall      = 1 << 2,
  OccupiedKey       = 1 << 3,
  NonexistedKey     = 1 << 4,
  NoServer          = 1 << 5,
  MultipleInstall   = 1 << 6,
}

export interface BufferHandler {
  (msg: Buffer): Status;
}

export type Maybe<T> = T | void | null | undefined;
