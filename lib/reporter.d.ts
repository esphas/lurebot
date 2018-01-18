import { Status } from './types';
import fetch from 'node-fetch';
export interface Witness {
    message: string;
    address: string;
    reply(message: string): Promise<Status>;
}
export interface Reporter extends Witness {
    fetch: typeof fetch;
}
export declare function hireReporter(witness: Witness): Reporter;
export interface HKReporter extends Reporter {
    matched: RegExpMatchArray;
}
