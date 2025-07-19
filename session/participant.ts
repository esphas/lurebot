import { Logger } from "winston";

import { Database, Repository } from "../db";

export type ParticipantRole = "owner" | "moderator" | "member";

export interface Participant {
  session_id: string;
  user_id: number;
  role: ParticipantRole;
  joined_at: Date;
  last_active: Date;
}

export interface ParticipantDB {
  session_id: string;
  user_id: number;
  role: ParticipantRole;
  joined_at: string;
  last_active: string;
}

export class ParticipantRepository extends Repository<
  Participant,
  ParticipantDB
> {
  constructor(db: Database, logger: Logger) {
    super(db, logger, "session_participants");
  }

  get transform() {
    return {
      session_id: this.tf.id,
      user_id: this.tf.id,
      role: this.tf.id,
      joined_at: this.tf.date,
      last_active: this.tf.date,
    };
  }
}
