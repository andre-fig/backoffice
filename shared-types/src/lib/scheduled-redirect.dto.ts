import { RedirectStatus } from './enums';

export interface CreateScheduledRedirectDto {
  sourceUserId: string;
  destinationUserId: string;
  sectorCode: string;
  startDate: Date;
  endDate: Date | null;
}

export interface UpdateRedirectEndDateDto {
  endDate: Date;
}

export interface ScheduledRedirectResponseDto {
  id: string;
  sourceUserId: string;
  destinationUserId: string;
  sectorCode: string;
  startDate: Date;
  endDate: Date | null;
  status: RedirectStatus;
  createdAt: Date;
}

export interface ActiveRedirectResponseDto {
  sectorCode: string;
  sourceUserId: string;
  destinationUserId: string;
  status: RedirectStatus.ACTIVE;
}

export interface RedirectListResponseDto {
  id: string;
  status: RedirectStatus.ACTIVE | RedirectStatus.SCHEDULED;
  sectorCode: string;
  sectorName: string;
  sourceUserId: string;
  sourceUserName: string;
  destinationUserId: string;
  destinationUserName: string;
  startDate: Date | null;
  endDate: Date | null;
}
