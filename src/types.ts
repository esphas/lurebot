
interface LurebotOptions {
  port?: number;
  host?: string;
}

type Ker = string;

const enum Status {
  Success       = 0,
  Unknown       = 1 << 0,
  ArgumentError = 1 << 1,
  RepeatedCall  = 1 << 2,
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

type Identity = any; //

interface Reporter {
  reply(message: string): Promise<Status>;
}

interface Matched extends Array<string> {
  input: string;
}

type Wind = string | RegExp | string[] | RegExp[];
interface Drop {
  (reporter: Reporter, identity: Identity, matched: Matched): void;
}
