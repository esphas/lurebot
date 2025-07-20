import { Logger } from "winston";

import { Database, Repository } from "../db";
import { cond, WhereCondition } from "../db/database";

export interface SessionMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  digested: boolean;
  is_digest: boolean;
  created_at: Date;
}

export interface SessionMessageDB {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  digested: 0 | 1;
  is_digest: 0 | 1;
  created_at: string;
}

export class SessionMessageRepository extends Repository<
  SessionMessage,
  SessionMessageDB
> {
  constructor(db: Database, logger: Logger) {
    super(db, logger, "session_messages");
  }

  get transform() {
    return {
      id: this.tf.id,
      session_id: this.tf.id,
      role: this.tf.id,
      content: this.tf.id,
      digested: this.tf.bool,
      is_digest: this.tf.bool,
      created_at: this.tf.date,
    };
  }

  get_messages(
    session_id: string,
    options: {
      limit?: number;
      since?: Date;
      digest?: "digested" | "undigested" | "all";
      with_digest?: boolean;
    } = {},
  ) {
    const where: WhereCondition<SessionMessage> = { session_id };
    if (options.since) {
      where.created_at = cond.gte(options.since);
    }
    if (options.digest && options.digest !== "all") {
      where.digested = cond.eq(options.digest === "digested");
    }
    if (!options.with_digest) {
      where.is_digest = false;
    }
    const messages = this.select(where, {
      limit: options.limit,
      order_by: "created_at",
    });
    return messages;
  }
}
