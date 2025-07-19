import { Logger } from "winston";

import { Database, Repository } from "../db";

export interface SessionVariable {
  session_id: string;
  key: string;
  value: object;
  created_at: Date;
  updated_at: Date;
}

export interface SessionVariableDB {
  session_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export class SessionVariableRepository extends Repository<
  SessionVariable,
  SessionVariableDB
> {
  constructor(db: Database, logger: Logger) {
    super(db, logger, "session_variables");
  }

  get transform() {
    return {
      session_id: this.tf.id,
      key: this.tf.id,
      value: this.tf.json,
      created_at: this.tf.date,
      updated_at: this.tf.date,
    };
  }

  get_value<T>(session_id: string, key: string) {
    return this.get({ session_id, key })?.value as T | null;
  }

  set_value<T>(session_id: string, key: string, value: T) {
    if (this.exists({ session_id, key })) {
      this.update({ value: value as object }, { session_id, key });
    } else {
      this.insert({ session_id, key, value: value as object });
    }
  }
}
