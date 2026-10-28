// Types for AgriTrace API and frontend state.
export type Role =
  | 'FARMER'
  | 'DISTRIBUTOR'
  | 'WHOLESALER'
  | 'PROCESSOR'
  | 'RETAILER'
  | 'AUDITOR'
  | 'ADMIN'
  | 'CONSUMER';

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface BatchSummary {
  id: string;
  crop: string;
  currentQuantityGrams: number;
  status: 'ACTIVE' | 'CONSUMED' | 'RECALLED';
  harvestDate: string;
}

export interface PublicVerification {
  publicBatchId: string;
  crop: string;
  harvestDate: string;
  region?: string;
  status: 'VERIFIED' | 'PENDING' | 'INCOMPLETE' | 'MISMATCH' | 'RECALL';
  recallNotice?: string;
}

