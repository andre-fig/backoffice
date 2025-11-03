interface VdiResponsible {
  id: string;
  name: string;
  email: string;
}

interface VdiGroup {
  id: string;
  name: string;
  responsibles: VdiResponsible[];
}

interface VdiSector {
  branch: number;
  id: number;
  name: string;
  code: string;
}

interface VdiStructs {
  sectors: VdiSector[];
}

interface VdiProfile {
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
