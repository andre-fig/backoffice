export interface VdiResponsible {
  id: string;
  name: string;
  email: string;
}

export interface VdiGroup {
  id: string;
  name: string;
  responsibles: VdiResponsible[];
}

export interface VdiSector {
  branch: number;
  id: number;
  name: string;
  code: string;
}

export interface VdiStructs {
  sectors: VdiSector[];
}

export interface VdiProfile {
  id: string;
  name: string;
  code: string;
}

export interface VdiUserResponseDto {
  id: string;
  name: string;
  email: string;
  active: boolean;
  groups: VdiGroup[];
  structs: VdiStructs;
  profiles: VdiProfile[];
}
