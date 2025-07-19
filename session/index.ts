import { Logger } from "winston";

import { Database } from "../db";

import { Session, SessionRepository } from "./session";
import { ParticipantRepository } from "./participant";
import { SessionVariableRepository } from "./variable";

export const FAILURE_REASONS = [
  "session_already_exists",
  "session_not_found",
  "session_not_belong_to_user",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export type Optional<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      reason: FailureReason;
    };

export class Sessions {
  private session: SessionRepository;
  private participant: ParticipantRepository;
  private variable: SessionVariableRepository;

  constructor(
    private db: Database,
    private logger: Logger,
  ) {
    this.session = new SessionRepository(db, logger);
    this.participant = new ParticipantRepository(db, logger);
    this.variable = new SessionVariableRepository(db, logger);
  }

  private generate_session_id(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  create_session(
    identifier: {
      topic: string;
      user_id: number;
      scope_id: number;
    },
    options: Partial<Session> = {},
  ): Optional<Session> {
    const existing_session = this.find_participant_session(identifier);
    if (existing_session) {
      return {
        ok: false,
        reason: "session_already_exists",
      };
    }

    const session_id = this.generate_session_id();

    this.db.transaction(() => {
      this.session.insert({
        id: session_id,
        topic: identifier.topic,
        created_by: identifier.user_id,
        scope_id: identifier.scope_id,
        ttl: null,
        ...options,
      });

      this.participant.insert({
        session_id,
        user_id: identifier.user_id,
        role: "owner",
      });
    })();

    return {
      ok: true,
      data: this.get_session(session_id)!,
    };
  }

  get_session(session_id: string, validate: boolean = true): Session | null {
    return this.session.find(session_id, validate);
  }

  get_or_create_session(
    identifier: {
      user_id: number;
      topic: string;
      scope_id: number;
    },
    options: Partial<Session> = {},
  ): Optional<Session> {
    const existing_session = this.find_participant_session(identifier);
    if (existing_session) {
      return {
        ok: true,
        data: existing_session,
      };
    }
    return this.create_session(identifier, options);
  }

  delete_session(session_id: string): boolean {
    return this.session.delete({ id: session_id }) > 0;
  }

  get_participant_sessions(
    user_id: number,
    validate: boolean = true,
  ): Session[] {
    const sps = this.participant.select({ user_id });
    return sps
      .map((sp) => this.get_session(sp.session_id, validate))
      .filter((session) => session != null);
  }

  find_participant_session(identifier: {
    user_id: number;
    topic: string;
    scope_id: number;
  }): Session | null {
    const sessions = this.get_participant_sessions(identifier.user_id);

    return (
      sessions.find(
        (session) =>
          session.topic === identifier.topic &&
          session.scope_id === identifier.scope_id,
      ) ?? null
    );
  }

  get_variable<T>(session_id: string, key: string) {
    return this.variable.get_value<T>(session_id, key);
  }

  set_variable<T>(session_id: string, key: string, value: T) {
    return this.variable.set_value<T>(session_id, key, value);
  }
}
