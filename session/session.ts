import { Logger } from "winston";

import { Database, Repository } from "../db";

export interface Session {
  id: string;
  created_at: Date;
  last_active: Date;
  topic: string;
  created_by: number;
  scope_id: number;
  ttl: number | null;
}

export interface SessionDB {
  id: string;
  created_at: string;
  last_active: string;
  topic: string;
  created_by: number;
  scope_id: number;
  ttl: number;
}

export class SessionRepository extends Repository<Session, SessionDB> {
  constructor(db: Database, logger: Logger) {
    super(db, logger, "sessions");
  }

  get transform() {
    return {
      id: this.tf.id,
      created_at: this.tf.date,
      last_active: this.tf.date,
      topic: this.tf.id,
      created_by: this.tf.id,
      scope_id: this.tf.id,
      ttl: this.tf.id_or(0),
    };
  }

  find(id: string, validate: boolean = true): Session | null {
    const session = this.get({ id });
    if (!session) {
      return null;
    }
    if (!validate) {
      return session;
    }

    if (session.ttl) {
      const now = new Date();
      if (now.getTime() - session.last_active.getTime() > session.ttl) {
        this.delete({ id });
        return null;
      }
    }

    return session;
  }
}
