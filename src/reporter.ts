
export interface Reporter {
  message: string;
  matched: RegExpMatchArray | null;
  address: string;
  reply(message: string): Promise<Status>
}
