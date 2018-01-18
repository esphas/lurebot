import { Status } from './types';
import { Identity, Position } from './identity';
import fetch from 'node-fetch';

export interface Witness {
  message: string;  // full origin message
  address: string;  // the key of the adapter
  identity: Identity;
  position: Position;
  reply(message: string): Promise<Status>;
}

export interface Reporter extends Witness {
  private: boolean; // is the message private
  fetch: typeof fetch;
}

export function hireReporter(witness: Witness): Reporter {
  return Object.assign({}, witness, { fetch, private: witness.position.private });
}

export interface HKReporter extends Reporter {
  matched: RegExpMatchArray;
}
