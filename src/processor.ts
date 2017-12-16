import { Reporter } from "./reporter";
import { Identity } from "./identity";

export interface Processor {
  (reporter: Reporter, identity: Identity, next: Next): Maybe<Status>;
}

export interface LooseProcessor {
  (reporter: Reporter, identity: Identity, next?: Next): Maybe<Status>;
}

export interface Next {
  (err?: Error): Maybe<Status>;
}
