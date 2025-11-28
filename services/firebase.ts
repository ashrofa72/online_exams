import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, addDoc, orderBy, deleteDoc } from "firebase/firestore";
import { User, UserRole, Exam, Submission, QuestionType } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBur7LaUgmhhfcJY-qWk-OvMQTHN5OecUY",
  authDomain: "onlineexams-43426.firebaseapp.com",
  projectId: "onlineexams-43426",
  storageBucket: "onlineexams-43426.firebasestorage.app",
  messagingSenderId: "1059292040368",
  appId: "1:1059292040368:web:f416d22ba5aaa41982bf75"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const ADMIN_EMAIL = "726863@qena1.moe.edu.eg";

// Helper to remove undefined values which Firestore hates
const cleanData = (obj: any): any => {
  // If undefined, return undefined so key is omitted in object loop,
  // or filtered out in array loop
  if (obj === undefined) return undefined;
  
  if (obj === null) return null;
  
  if (obj instanceof Date) return obj.toISOString();
  
  if (Array.isArray(obj)) {
    // Recursively clean array items and filter out undefineds
    return obj.map(cleanData).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const cleanedValue = cleanData(value);
      if (cleanedValue !== undefined) {
        newObj[key] = cleanedValue;
      }
    });
    return newObj;
  }
  
  return obj;
};

// Safe ID generator helper
const safeUUID = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userProfile = await DbService.getUserProfile(userCredential.user.uid);
    
    if (!userProfile) {
      // If auth exists but profile doesn't, we prompt them to fix it via Sign Up
      throw new Error("User profile data is missing. Please use 'Sign Up' again with your details to repair your account.");
    }

    // Security Check: If email matches Admin but role isn't ADMIN, fix it immediately
    if (userProfile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && userProfile.role !== UserRole.ADMIN) {
      console.log("Upgrading user to ADMIN...");
      userProfile.role = UserRole.ADMIN;
      await setDoc(doc(db, "users", userProfile.id), cleanData(userProfile));
    }

    return userProfile;
  },

  register: async (email: string, password: string, userData: Partial<User>): Promise<User> => {
    let userCredential;
    let isRecovery = false;

    // Force Admin Role if email matches
    const finalRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? UserRole.ADMIN : (userData.role || UserRole.STUDENT);

    try {
      // Try to create new account
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // If email exists, try to sign in to see if we can repair the profile
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          isRecovery = true;
        } catch (loginError) {
          throw new Error("Email already in use. Please sign in.");
        }
      } else {
        throw error;
      }
    }

    if (!userCredential) throw new Error("Authentication failed");

    // If this was a recovery login, check if profile actually exists
    if (isRecovery) {
      const existingProfile = await DbService.getUserProfile(userCredential.user.uid);
      if (existingProfile) {
        // Double check admin role on recovery
        if (existingProfile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && existingProfile.role !== UserRole.ADMIN) {
           existingProfile.role = UserRole.ADMIN;
           await setDoc(doc(db, "users", existingProfile.id), cleanData(existingProfile));
        }
        throw new Error("Account already exists. Please sign in.");
      }
      // If no profile, we proceed to create it (Self-healing)
    }

    const newUser: User = {
      id: userCredential.user.uid,
      email: email,
      name: userData.name || '',
      role: finalRole,
      studentCode: userData.studentCode,
      teacherCode: userData.teacherCode,
      classroom: userData.classroom,
      createdAt: new Date().toISOString()
    };
    
    // cleanData strips undefined fields to prevent Firestore errors
    await setDoc(doc(db, "users", newUser.id), cleanData(newUser));
    
    // If recovery, force refresh the auth state so the app picks up the new profile
    if (isRecovery) {
       await signOut(auth);
       await signInWithEmailAndPassword(auth, email, password);
    }
    
    return newUser;
  },

  logout: async () => {
    await signOut(auth);
  }
};

export const DbService = {
  getUserProfile: async (uid: string): Promise<User | null> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },

  // --- Admin Operations ---
  getAllUsers: async (): Promise<User[]> => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  getAllExams: async (): Promise<Exam[]> => {
    const q = query(collection(db, "exams"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
  },

  deleteUser: async (userId: string): Promise<void> => {
    // Note: This only deletes the profile from Firestore. 
    // To delete from Authentication requires Firebase Admin SDK (server-side).
    // Deleting the profile effectively locks them out of the app.
    await deleteDoc(doc(db, "users", userId));
  },

  // Exam Operations
  createExam: async (exam: Exam): Promise<void> => {
    const examsRef = collection(db, "exams");
    const { id, ...examData } = exam;
    
    // Use cleanData to ensure no undefined values are sent
    if (id) {
       await setDoc(doc(db, "exams", id), cleanData(examData));
    } else {
       await addDoc(examsRef, cleanData(examData));
    }
  },

  getExamsForTeacher: async (teacherId: string): Promise<Exam[]> => {
    const q = query(collection(db, "exams"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
  },

  getExamsForStudent: async (classroom: string): Promise<Exam[]> => {
    // Updated query: check if 'targetClassrooms' array contains the specific classroom
    const q = query(
      collection(db, "exams"), 
      where("published", "==", true),
      where("targetClassrooms", "array-contains", classroom)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
  },

  getExamById: async (examId: string): Promise<Exam | undefined> => {
    const docRef = doc(db, "exams", examId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Exam) : undefined;
  },

  publishExam: async (examId: string, isPublished: boolean): Promise<void> => {
    const examRef = doc(db, "exams", examId);
    await updateDoc(examRef, { published: isPublished });
  },

  deleteExam: async (examId: string): Promise<void> => {
    await deleteDoc(doc(db, "exams", examId));
  },

  // Submission Operations
  submitExam: async (submission: Submission): Promise<void> => {
    console.log("DbService: submitting exam...", submission.id);
    const { id, ...subData } = submission;
    const finalId = id || safeUUID();
    
    const cleanedData = cleanData(subData);
    
    await setDoc(doc(db, "submissions", finalId), cleanedData);
    console.log("DbService: exam submitted successfully");
  },

  getSubmissionsForExam: async (examId: string): Promise<Submission[]> => {
    const q = query(collection(db, "submissions"), where("examId", "==", examId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
  },

  getSubmissionsForStudent: async (studentId: string): Promise<Submission[]> => {
    const q = query(collection(db, "submissions"), where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
  },

  updateSubmissionScore: async (submissionId: string, manualScore: number): Promise<void> => {
    const subRef = doc(db, "submissions", submissionId);
    const subSnap = await getDoc(subRef);
    if (subSnap.exists()) {
      const data = subSnap.data() as Submission;
      const totalScore = data.autoScore + manualScore;
      await updateDoc(subRef, { manualScore, totalScore, graded: true });
    }
  }
};

// Helper to auto-grade
export const AutoGrader = {
  grade: (exam: Exam, answers: Record<string, string>): number => {
    let score = 0;
    if (!exam || !exam.questions) return 0;
    
    exam.questions.forEach(q => {
      const studentAnswer = answers[q.id] || "";
      
      if (q.type === QuestionType.MCQ) {
        if (q.options && q.correctOptionIndex !== undefined) {
          const correctText = q.options[q.correctOptionIndex];
          if (studentAnswer === correctText) score += q.marks;
        }
      } else if (q.type === QuestionType.TRUE_FALSE) {
        // Exact text match (صواب / خطأ)
        if (studentAnswer === q.correctAnswerText) {
          score += q.marks;
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