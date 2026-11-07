export interface UserData {
  user_id: number;
  group_id: number;
}

export class User implements UserData {
  readonly user_id: number;
  readonly group_id: number;

  constructor(data: UserData) {
    this.user_id = data.user_id;
    this.group_id = data.group_id;
  }

  get id(): number {
    return this.user_id;
  }
}
