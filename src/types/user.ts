export type UserRole = 'client' | 'driver' | 'both';
export type UserMode = 'client' | 'driver';
export type UserStatus = 'free' | 'conditioned';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  activeServiceId: string | null;
  driverRating: number | null;
  driverRatingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

// fluxo: pending - negotiating - accepted - in_progress - completed
// a qualquer momeynto pode ir para cancelled ou expired
export type ServiceStatus =
  | 'pending'
  | 'negotiating'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';


export interface Service {
  id: string;
  clientId: string;
  clientName: string;
  driverId: string | null;
  driverName: string | null;
  driverRating: number | null;        
  origin: LocationData;
  destination: LocationData;
  status: ServiceStatus;
  estimatedPickupTime: number | null; 
  driverCompleted: boolean;
  clientCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  negotiationStartedAt: Date | null;  
  acceptedAt: Date | null;           
  completedAt: Date | null;
  rating: number | null;
  ratingComment: string | null;
}

export interface CreateServiceData {
  clientId: string;
  clientName: string;
  origin: LocationData;
  destination: LocationData;
}

export interface CreateUserProfileData {
  email: string;
  name: string;
  role: UserRole;
}

