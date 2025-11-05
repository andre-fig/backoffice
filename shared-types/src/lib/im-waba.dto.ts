export interface ImWabaDto {
  wabaId: string;
  wabaName: string;
  isVisible: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AddImWabaDto {
  wabaId: string;
  wabaName: string;
}

export interface RemoveImWabaDto {
  wabaId: string;
}

export interface UpdateImWabaVisibilityDto {
  wabaId: string;
  isVisible: boolean;
}
