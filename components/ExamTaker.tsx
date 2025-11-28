import React, { useState, useEffect, useRef } from 'react';
import { Exam, QuestionType, Submission, User } from '../types';
import { AutoGrader, DbService } from '../services/firebase';
import { Clock, Send, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ExamTakerProps {
  exam: Exam;
  user: User;
  onClose: () => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, user, onClose }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.timeLimitMinutes ? exam.timeLimitMinutes * 60 : null);
  
  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultModal, setResultModal] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    score?: number;
  }>({ show: false, type: 'success', title: '', message: '' });

  // Ref to keep track of answers for the timer effect to avoid stale closures
  const answersRef = useRef(answers);
  const submittingRef = useRef(submitting);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  // Safe ID generator fallback
  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {
      // Ignore
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  };

  const handleInitialSubmit = () => {
    if (submitting) return;
    setShowConfirmModal(true);
  };

  const processSubmission = async (force: boolean = false) => {
    console.log("processSubmission called. Force:", force, "Submitting:", submittingRef.current);
    
    if (submittingRef.current) return;
    
    if (!user || !user.id) {
      setResultModal({
        show: true,
        type: 'error',
        title: 'خطأ في المصادقة',
        message: 'بيانات المستخدم غير صالحة. يرجى تسجيل الدخول مرة أخرى.'
      });
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;
    
    try {
      // Use current answers from ref if forced (timer), otherwise state is fine for button click
      const currentAnswers = force ? answersRef.current : answers;
      
      // Calculate score safely
      let autoScore = 0;
      try {
        autoScore = AutoGrader.grade(exam, currentAnswers);
      } catch (gradeError) {
        console.error("AutoGrader error:", gradeError);
        // Continue submission even if grading fails locally
      }

      const submissionId = generateId();
      
      const submission: Submission = {
        id: submissionId,
        examId: exam.id,
        studentId: user.id,
        studentName: user.name || 'Unknown Student',
        studentCode: user.studentCode || 'N/A',
        answers: currentAnswers,
        autoScore,
        manualScore: 0,
        totalScore: autoScore, 
        submittedAt: new Date().toISOString(),
        graded: false
      };

      console.log("Submitting payload:", submission);
      
      await DbService.submitExam(submission);
      console.log("Submission successful to Firebase");
      
      setResultModal({
        show: true,
        type: 'success',
        title: 'تم التسليم بنجاح!',
        message: 'تم حفظ إجاباتك بنجاح.',
        score: autoScore
      });

    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage = error?.message || "Unknown error";
      
      setResultModal({
        show: true,
        type: 'error',
        title: 'فشل التسليم',
        message: `حدث خطأ أثناء الاتصال بقاعدة البيانات:\n${errorMessage}\n\nيرجى المحاولة مرة أخرى.`
      });
      
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      console.log("Time expired, forcing submission");
      processSubmission(true); // Force submit
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto pb-24" dir="rtl">
      {/* Sticky Header */}
      <div className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">{exam.title}</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">{exam.subject} • {exam.questions.length} أسئلة</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg shadow-inner ${timeLeft < 300 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-700'}`}>
                <Clock size={20} />
                {formatTime(timeLeft)}
              </div>
            )}
            <button 
              type="button"
              onClick={handleInitialSubmit} 
              disabled={submitting}
              className="bg-primary hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? 'جاري التسليم...' : <><Send size={18} className="transform rotate-180" /> تسليم الامتحان</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {exam.description && (
           <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4 text-blue-800 shadow-sm">
             <AlertCircle size={24} className="mt-0.5 flex-shrink-0 text-blue-600" />
             <div>
               <h4 className="font-bold mb-1">تعليمات:</h4>
               <p className="leading-relaxed">{exam.description}</p>
             </div>
           </div>
        )}

        {exam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="font-bold text-xl text-slate-900 leading-snug">{idx + 1}. {q.text}</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg h-fit whitespace-nowrap">{q.marks} درجات</span>
            </div>

            {/* Input area based on type */}
            <div className="mt-6">
              {q.type === QuestionType.MCQ && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, i) => (
                    <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-primary bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${answers[q.id] === opt ? 'border-primary' : 'border-slate-300'}`}>
                        {answers[q.id] === opt && <div className="w-3 h-3 bg-primary rounded-full" />}
                      </div>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswerChange(q.id, opt)}
                        className="hidden"
                      />
                      <span className={`text-lg ${answers[q.id] === opt ? 'font-bold text-primary' : 'font-medium text-slate-700'}`}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === QuestionType.TRUE_FALSE && (
                <div className="flex gap-4">
                  {['صواب', 'خطأ'].map((opt) => (
                    <label key={opt} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-primary bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswerChange(q.id, opt)}
                        className="hidden"
                      />
                      <span className={`text-lg ${answers[q.id] === opt ? 'font-bold text-primary' : 'font-medium text-slate-700'}`}>{opt}</span>
                      {answers[q.id] === opt && <CheckCircle size={20} className="text-primary" />}
                    </label>
                  ))}
                </div>
              )}

              {(q.type === QuestionType.FILL_BLANK || q.type === QuestionType.SHORT_ANSWER) && (
                <input 
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-lg transition-all"
                  placeholder="اكتب إجابتك هنا..."
                />
              )}

              {q.type === QuestionType.LONG_ANSWER && (
                <textarea 
                  rows={6}
                  value={answers[q.id] || ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-lg transition-all"
                  placeholder="اكتب إجابتك التفصيلية هنا..."
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 mb-3">تأكيد تسليم الامتحان</h3>
            <p className="text-center text-slate-600 mb-8 leading-relaxed">
              هل أنت متأكد من رغبتك في إنهاء الامتحان وتسليم الإجابات؟
              <br/>
              <span className="text-sm font-bold text-red-500">لا يمكنك التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                مراجعة الإجابات
              </button>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  processSubmission(true);
                }}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
              >
                نعم، تسليم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result/Error Modal */}
      {resultModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${resultModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {resultModal.type === 'success' ? <CheckCircle size={40} /> : <XCircle size={40} />}
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">{resultModal.title}</h3>
            
            <p className="text-center text-slate-600 mb-6 whitespace-pre-wrap">{resultModal.message}</p>
            
            {resultModal.type === 'success' && resultModal.score !== undefined && (
              <div className="bg-slate-50 rounded-2xl p-4 text-center mb-6 border border-slate-100">
                <span className="text-sm text-slate-500 font-bold block mb-1">الدرجة التلقائية</span>
                <span className="text-3xl font-extrabold text-primary">{resultModal.score}</span>
              </div>
            )}

            <button 
              onClick={() => {
                setResultModal(prev => ({ ...prev, show: false }));
                if (resultModal.type === 'success') {
                  onClose();
                }
              }}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-colors ${resultModal.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
            >
              {resultModal.type === 'success' ? 'إغلاق والعودة' : 'حاول مرة أخرى'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};