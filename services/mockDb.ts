import { User, Exam, Submission, UserRole, Question, QuestionType } from '../types';

// Helper to delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  USERS: 'examforge_users',
  EXAMS: 'examforge_exams',
  SUBMISSIONS: 'examforge_submissions',
  CURRENT_USER: 'examforge_current_user'
};

// Initial Data Loading
const load = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const save = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const MockAuth = {
  login: async (email: string, role: UserRole): Promise<User> => {
    await delay(500);
    const users = load<User>(STORAGE_KEYS.USERS);
    let user = users.find(u => u.email === email && u.role === role);
    
    if (!user) {
      // Auto-register for demo purposes if not found, to lower friction
      user = {
        id: crypto.randomUUID(),
        email,
        name: email.split('@')[0],
        role,
        classroom: role === UserRole.STUDENT ? '10A' : undefined,
        studentCode: role === UserRole.STUDENT ? 'ST-' + Math.floor(Math.random() * 1000) : undefined,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      save(STORAGE_KEYS.USERS, users);
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await delay(200);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }
};

export const MockDb = {
  // Exam Operations
  createExam: async (exam: Exam): Promise<void> => {
    await delay(600);
    const exams = load<Exam>(STORAGE_KEYS.EXAMS);
    exams.push(exam);
    save(STORAGE_KEYS.EXAMS, exams);
  },

  getExamsForTeacher: async (teacherId: string): Promise<Exam[]> => {
    await delay(400);
    const exams = load<Exam>(STORAGE_KEYS.EXAMS);
    return exams.filter(e => e.teacherId === teacherId);
  },

  getExamsForStudent: async (classroom: string): Promise<Exam[]> => {
    await delay(400);
    const exams = load<Exam>(STORAGE_KEYS.EXAMS);
    // Return published exams matching classroom
    return exams.filter(e => e.published && e.targetClassrooms && e.targetClassrooms.includes(classroom));
  },

  getExamById: async (examId: string): Promise<Exam | undefined> => {
    const exams = load<Exam>(STORAGE_KEYS.EXAMS);
    return exams.find(e => e.id === examId);
  },

  publishExam: async (examId: string, isPublished: boolean): Promise<void> => {
    const exams = load<Exam>(STORAGE_KEYS.EXAMS);
    const idx = exams.findIndex(e => e.id === examId);
    if (idx !== -1) {
      exams[idx].published = isPublished;
      save(STORAGE_KEYS.EXAMS, exams);
    }
  },

  // Submission Operations
  submitExam: async (submission: Submission): Promise<void> => {
    await delay(800);
    const subs = load<Submission>(STORAGE_KEYS.SUBMISSIONS);
    subs.push(submission);
    save(STORAGE_KEYS.SUBMISSIONS, subs);
  },

  getSubmissionsForExam: async (examId: string): Promise<Submission[]> => {
    await delay(400);
    const subs = load<Submission>(STORAGE_KEYS.SUBMISSIONS);
    return subs.filter(s => s.examId === examId);
  },

  getSubmissionsForStudent: async (studentId: string): Promise<Submission[]> => {
    const subs = load<Submission>(STORAGE_KEYS.SUBMISSIONS);
    return subs.filter(s => s.studentId === studentId);
  },

  updateSubmissionScore: async (submissionId: string, manualScore: number): Promise<void> => {
    const subs = load<Submission>(STORAGE_KEYS.SUBMISSIONS);
    const idx = subs.findIndex(s => s.id === submissionId);
    if (idx !== -1) {
      subs[idx].manualScore = manualScore;
      subs[idx].totalScore = subs[idx].autoScore + manualScore;
      subs[idx].graded = true;
      save(STORAGE_KEYS.SUBMISSIONS, subs);
    }
  }
};

// Helper to auto-grade
export const AutoGrader = {
  grade: (exam: Exam, answers: Record<string, string>): number => {
    let score = 0;
    exam.questions.forEach(q => {
      const studentAnswer = answers[q.id] || "";
      
      if (q.type === QuestionType.MCQ) {
        if (q.options && q.correctOptionIndex !== undefined) {
          const correctText = q.options[q.correctOptionIndex];
          if (studentAnswer === correctText) score += q.marks;
        }
      } else if (q.type === QuestionType.FILL_BLANK) {
        if (studentAnswer.trim().toLowerCase() === (q.correctAnswerText || "").trim().toLowerCase()) {
          score += q.marks;
        }
      } else if (q.type === QuestionType.SHORT_ANSWER) {
        // Simple keyword check
        if (q.keywords && q.keywords.some(k => studentAnswer.toLowerCase().includes(k.toLowerCase()))) {
          score += q.marks;
        } else if (q.correctAnswerText && studentAnswer.toLowerCase() === q.correctAnswerText.toLowerCase()) {
          score += q.marks;
        }
      }
      // Long answers are manually graded, score 0 initially
    });
    return score;
  }
};