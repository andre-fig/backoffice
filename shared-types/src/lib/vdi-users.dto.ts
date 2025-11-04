interface MetaData {
  hasNextPage: boolean;
  next: string | null;
  hasPrevPage: boolean;
  previous: string | null;
  perPage: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface VdiUsersDto {
  data: UserData[];
  meta: MetaData;
}
