import { Status } from './types';

export interface Reporter {
  message: string;
  address: string;
  reply(message: string): Promise<Status>
}
