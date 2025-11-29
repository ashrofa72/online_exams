import React, { useState, useEffect, useCallback } from 'react';
import { User, Exam } from '../types';
import { DbService } from '../services/firebase';
import { ExamTaker } from './ExamTaker';
import { FileText, Clock, ChevronLeft, Calendar, CheckCircle, Lock, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submittedExamIds, setSubmittedExamIds] = useState<Set<string>>(new Set());
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    if (user.classroom && user.id) {
      setLoading(true);
      try {
        // Fetch exams and submissions in parallel
        const [examsData, submissionsData] = await Promise.all([
          DbService.getExamsForStudent(user.classroom),
          DbService.getSubmissionsForStudent(user.id)
        ]);
        
        setExams(examsData);
        // Create a Set of exam IDs that have been submitted
        setSubmittedExamIds(new Set(submissionsData.map(s => s.examId)));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user.classroom, user.id]);

  useEffect(() => {
    fetchData();
    // Update current time every second to refresh status accurately
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleExamClose = () => {
    setActiveExam(null);
    // Refresh data to mark the just-finished exam as submitted
    fetchData();
  };

  const getExamStatus = (exam: Exam) => {
    const isSubmitted = submittedExamIds.has(exam.id);
    if (isSubmitted) return { status: 'submitted', label: 'تم تقديم الامتحان', canEnter: false };

    // Use currentTime state to ensure UI updates exactly when interval triggers
    if (exam.validFrom && currentTime < new Date(exam.validFrom)) {
      return { status: 'upcoming', label: 'لم يبدأ بعد', canEnter: false };
    }
    if (exam.validUntil && currentTime > new Date(exam.validUntil)) {
      return { status: 'expired', label: 'انتهى وقت الامتحان', canEnter: false };
    }
    
    return { status: 'active', label: 'ابدأ الامتحان', canEnter: true };
  };

  const handleStartExam = (exam: Exam) => {
    // Double check strict timing before allowing entry
    const now = new Date();
    if (exam.validFrom && now.getTime() < new Date(exam.validFrom).getTime()) {
      alert("عذراً، لم يحن موعد بدء الامتحان بعد.");
      return;
    }
    if (exam.validUntil && now.getTime() > new Date(exam.validUntil).getTime()) {
      alert("عذراً، انتهى وقت الامتحان.");
      return;
    }
    setActiveExam(exam);
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('ar-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (activeExam) {
    return <ExamTaker exam={activeExam} user={user} onClose={handleExamClose} />;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-10 bg-gradient-to-l from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">مرحباً، {user.name}! 👋</h1>
          <p className="opacity-90 font-medium text-indigo-100 text-lg">
            الصف: <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md mx-1">{user.classroom}</span> | 
            كود الطالب: <span className="font-mono bg-white/20 px-2 py-0.5 rounded-md mx-1">{user.studentCode}</span>
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <FileText className="text-primary"/> الامتحانات المتاحة
      </h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {exams.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-200">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Calendar size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-lg font-medium">لا توجد امتحانات متاحة لصفك الدراسي حالياً.</p>
            </div>
          ) : (
            exams.map(exam => {
              const { status, label, canEnter } = getExamStatus(exam);
              
              return (
                <div key={exam.id} className={`bg-white p-6 md:p-8 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between group gap-6 ${status === 'submitted' ? 'border-green-200 bg-green-50/30' : status === 'active' ? 'border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100' : 'border-slate-100 bg-slate-50 opacity-80'}`}>
                  <div className="flex items-center gap-6 w-full">
                    <div className={`p-5 rounded-2xl transition-transform duration-300 shadow-inner ${status === 'submitted' ? 'bg-green-100 text-green-600' : status === 'active' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 text-primary group-hover:scale-110' : 'bg-slate-200 text-slate-500'}`}>
                      {status === 'submitted' ? <CheckCircle size={32} /> : status === 'upcoming' || status === 'expired' ? <Lock size={32} /> : <FileText size={32} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{exam.title}</h3>
                        {(exam.validFrom || exam.validUntil) && (
                          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg flex flex-col gap-1 min-w-fit text-right" dir="rtl">
                            {exam.validFrom && <span className={currentTime < new Date(exam.validFrom) ? 'text-orange-600 font-bold' : ''}>يبدأ: {formatDateTime(exam.validFrom)}</span>}
                            {exam.validUntil && <span className={currentTime > new Date(exam.validUntil) ? 'text-red-600 font-bold' : ''}>ينتهي: {formatDateTime(exam.validUntil)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium mt-1">
                        <span className="bg-slate-100 px-3 py-1 rounded-full">{exam.subject}</span>
                        <span className="flex items-center gap-1"><Clock size={16} className="text-slate-400"/> {exam.timeLimitMinutes ? `${exam.timeLimitMinutes} دقيقة` : 'وقت مفتوح'}</span>
                        <span>{exam.questions.length} أسئلة</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => canEnter && handleStartExam(exam)}
                    disabled={!canEnter}
                    className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                      status === 'submitted'
                        ? 'bg-green-100 text-green-700 cursor-default border-2 border-transparent'
                        : status === 'active'
                        ? 'bg-white border-2 border-slate-100 text-slate-700 hover:border-primary hover:bg-primary hover:text-white group-hover:shadow-lg'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed border-2 border-transparent'
                    }`}
                  >
                    {status === 'submitted' ? (
                      <>تم تقديم الامتحان <CheckCircle size={20} /></>
                    ) : status === 'upcoming' ? (
                       <><Clock size={20} /> سيبدأ قريباً</>
                    ) : status === 'expired' ? (
                       <><AlertCircle size={20} /> انتهى الوقت</>
                    ) : (
                      <>ابدأ الامتحان <ChevronLeft size={20} className="transform transition-transform group-hover:-translate-x-1" /></>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};