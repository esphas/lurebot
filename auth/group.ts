import { Logger } from "winston";
import { Database, Repository } from "../db";
import { Auth, GeneralNapcatMessage } from ".";

export interface Group {
  id: number;
  qq: number | null;
  registered: boolean;
  banned_until: Date | null;
  created_at: Date;
}

export interface GroupDB {
  id: number;
  qq: number;
  registered: 0 | 1;
  banned_until: string;
  created_at: string;
}

export class GroupRepository extends Repository<Group, GroupDB> {
  constructor(
    private auth: Auth,
    db: Database,
    logger: Logger,
  ) {
    super(db, logger, "auth_group");
  }

  get transform() {
    return {
      id: this.tf.id,
      qq: this.tf.id_or(0),
      registered: this.tf.bool,
      banned_until: this.tf.date_or(""),
      created_at: this.tf.date,
    };
  }

  from_napcat(context: Omit<GeneralNapcatMessage, "user_id">) {
    const qq = context.group_id;
    if (qq == null) {
      return null;
    }
    const group = this.get({ qq });
    if (group) {
      return group;
    }
    const new_group = this.insert({ qq });
    if (!new_group) {
      throw new Error("Failed to create group");
    }
    return new_group;
  }

  ban(id: number, until: Date | null = null) {
    let banned_until = until;
    if (until == null) {
      banned_until = new Date();
      banned_until.setFullYear(banned_until.getFullYear() + 1);
    }
    this.update({ banned_until }, { id });
  }

  unban(id: number) {
    this.update({ banned_until: null }, { id });
  }

  is_banned(id: number, time: Date = new Date()) {
    const group = this.get({ id });
    if (group == null) {
      return false;
    }
    return group.banned_until != null && group.banned_until > time;
  }

  register(id: number) {
    return this.update({ registered: true }, { id });
  }

  unregister(id: number) {
    return this.update({ registered: false }, { id });
  }

  is_registered(id: number) {
    const group = this.get({ id });
    if (group == null) {
      return false;
    }
    return group.registered;
  }

  is_valid(id: number, time: Date = new Date()) {
    const group = this.get({ id });
    if (group == null) {
      return false;
    }
    return (
      group.registered &&
      !(group.banned_until != null && group.banned_until > time)
    );
  }
}
