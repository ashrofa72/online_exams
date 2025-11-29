export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentCode?: string; // Unique ID for students
  teacherCode?: string; // Unique ID for teachers (e.g. 717788)
  classroom?: string; // e.g. "10A"
  createdAt: string;
}

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
  SHORT_ANSWER = 'SHORT_ANSWER',
  LONG_ANSWER = 'LONG_ANSWER'
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  // For MCQ
  options?: string[];
  correctOptionIndex?: number;
  // For Fill/Short/TrueFalse
  correctAnswerText?: string; 
  // For Short (Keywords)
  keywords?: string[];
}

export interface Exam {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  targetClassrooms: string[]; 
  questions: Question[];
  published: boolean;
  timeLimitMinutes?: number;
  validFrom?: string; // ISO Date String: Start Time
  validUntil?: string; // ISO Date String: End Time
  createdAt: string;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  answers: Record<string, string>; // questionId -> answer
  autoScore: number;
  manualScore: number;
  totalScore: number;
  submittedAt: string;
  graded: boolean;
}