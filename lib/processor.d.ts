import { Reporter } from './reporter';
import { Identity } from './identity';
export interface Processor {
    (reporter: Reporter, identity: Identity, next: Next): void;
}
export interface PromisedProcessor {
    (reporter: Reporter, identity: Identity, next: Next): Promise<void>;
}
export interface Next {
    (err?: Error): void;
}
