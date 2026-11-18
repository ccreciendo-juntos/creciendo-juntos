export type GradeValue = 'AD' | 'A' | 'B' | 'C' | '';

export interface Capacity {
  id: string;
  name: string;
  shortName?: string;
}

export interface Competency {
  id: string;
  name: string;
  shortName: string;
  capacities: Capacity[];
  isTransversal?: boolean;
}

export interface StudentRecord {
  id: string;
  dni: string;
  fullName: string;
  grade: number; // 1 to 5
  section: string; // 'A', 'B', 'C'
  parentPhone?: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
}

export interface EvaluationRecord {
  studentId: string;
  bimestre: 'I' | 'II' | 'III' | 'IV';
  grade: number;
  section: string;
  // Map of capacityId -> GradeValue
  capacities: Record<string, GradeValue>;
  // Calculated competency averages
  competencyAverages: Record<string, GradeValue>;
  // Overall final grade for the period
  finalGrade: GradeValue;
  updatedAt: string;
}

export type AttendanceStatus = 'P' | 'F' | 'T' | 'J' | '';

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  grade: number;
  section: string;
  status: AttendanceStatus;
  observation?: string;
}

export interface TeacherAssignment {
  area: string;
  grade: number;
  section: string;
}
