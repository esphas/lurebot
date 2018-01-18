
export interface Identity {
  uid: number; // user id
  name: string;
  addresses: string[];
  anonymous: boolean;
}

export interface Position {
  pid: number; // position id
  private: boolean;
}
