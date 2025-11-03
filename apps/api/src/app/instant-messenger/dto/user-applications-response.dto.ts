interface Application {
  id: string;
  name: string;
}

export interface UserApplicationsResponseDto {
  data: Application[];
}
