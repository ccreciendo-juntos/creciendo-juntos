export type NovaActivityType = 'assignment' | 'quiz' | 'interactive' | 'mission' | 'material';

export type NovaQuestionType = 'multiple_choice' | 'checkboxes' | 'short_answer' | 'paragraph';

export interface NovaQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface NovaQuizQuestion {
  id: string;
  text: string;
  type: NovaQuestionType;
  options?: NovaQuestionOption[];
  points: number;
  required?: boolean;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
}

export interface NovaActivity {
  id: string;
  title: string;
  description: string;
  type: NovaActivityType;
  area: string; // Exclusively "Educación Religiosa"
  grade: number; // 1 to 5
  section: string; // 'A', 'B', 'C'
  due_date: string;
  created_at: string;
  competencies: string[]; // ['rel_c1', 'rel_c2']
  capacities?: Record<string, string[]>;
  questions?: NovaQuizQuestion[]; // For quizzes
  max_score: number; // Default 20
  time_limit?: number; // In minutes (0 = no limit)
  status: 'active' | 'archived';
  allow_file_upload?: boolean;
  allow_link?: boolean;
  allow_text?: boolean;
}

export interface NovaSubmission {
  id: string;
  activity_id: string;
  student_id: string;
  student_name: string;
  student_dni?: string;
  grade: number;
  section: string;
  submitted_at: string;
  status: 'Entregado' | 'Calificado' | 'Observado' | 'Pendiente';
  // For quiz
  answers?: Record<string, any>; // questionId -> selectedOptionId or text
  score?: number; // Score / 20
  achievement_level?: 'AD' | 'A' | 'B' | 'C';
  // For regular assignment
  evidence_text?: string;
  evidence_link?: string;
  evidence_file_name?: string;
  teacher_feedback?: string;
}
