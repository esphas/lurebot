
declare interface LurebotOptions {
  port?: number;
  host?: string;
}

declare type Ker = string;

declare const enum Status {
  Success       = 0,
  Unknown       = 1 << 0,
  ArgumentError = 1 << 1,
  RepeatedCall  = 1 << 2,
}

declare interface UpdateListener {
  (msg: Buffer): Status;
}

declare interface Installer {
  onUpdate(update: UpdateListener): Status;
}

declare interface Uninstaller {
  removeUpdate(): Status;
}

declare type Identity = any; //

declare interface Reporter {
  reply(message: string): Promise<Status>;
}

declare interface Matched extends Array<string> {
  input: string;
}

declare type Wind = string | RegExp | string[] | RegExp[];
declare interface Drop {
  (reporter: Reporter, identity: Identity, matched: Matched): void;
}
