export interface ImWabaDto {
  wabaId: string;
  wabaName: string;
  createdAt?: Date;
}

export interface AddImWabaDto {
  wabaId: string;
  wabaName: string;
}

export interface RemoveImWabaDto {
  wabaId: string;
}
