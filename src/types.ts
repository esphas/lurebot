type LurebotOptions = {
  port?: number;
  host?: string;
};

type Ker = string;

type Status = number;

type Identity = any;

type UpdateListener =
  (msg: Buffer) => Status;

type Installer = {
  onUpdate: (update: UpdateListener) => void;
};

type Uninstaller = {
};

type Reporter = {
  reply: (message: string) => Promise<Status>;
};

type Matched = string[]; //

type Wind = string | RegExp | string[] | RegExp[];
type Drop =
  (reporter: Reporter, identity: Identity, matched: Matched) => void;
