import { Reporter } from './reporter';
import { Identity } from './identity';
import { Status, Maybe } from './types';

export interface Processor {
  (reporter: Reporter, identity: Identity, next: Next): void;
}

export interface LooseProcessor {
  (reporter: Reporter, identity: Identity, next?: Next): Promise<void>;
}

export interface Next {
  (err?: Error): Maybe<Status>;
}
