export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  parentEmail: string;
  normalizedFirstName: string;
  normalizedLastName: string;
  normalizedParentEmail: string;
  metaphoneFirstName: string;
  metaphoneLastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAthleteInput {
  firstName: string;
  lastName: string;
  position: string;
  parentEmail: string;
}

export interface DuplicateCheckInput {
  firstName: string;
  lastName: string;
  parentEmail?: string;
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  level: 'exact' | 'phonetic' | 'similar' | 'none';
  confidence: number;
  details: string;
  matchedAthlete?: {
    id: string;
    firstName: string;
    lastName: string;
    parentEmail: string;
  };
}

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertMessage {
  type: AlertType;
  title: string;
  message: string;
}
