import React, { useState, useEffect, useCallback } from 'react';
import { User, Exam } from '../types';
import { DbService } from '../services/firebase';
import { ExamTaker } from './ExamTaker';
import { FileText, Clock, ChevronLeft, Calendar, CheckCircle } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submittedExamIds, setSubmittedExamIds] = useState<Set<string>>(new Set());
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, [fetchData]);

  const handleExamClose = () => {
    setActiveExam(null);
    // Refresh data to mark the just-finished exam as submitted
    fetchData();
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
              const isSubmitted = submittedExamIds.has(exam.id);
              
              return (
                <div key={exam.id} className={`bg-white p-6 md:p-8 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between group gap-6 ${isSubmitted ? 'border-green-200 bg-green-50/30' : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100'}`}>
                  <div className="flex items-center gap-6 w-full">
                    <div className={`p-5 rounded-2xl transition-transform duration-300 shadow-inner ${isSubmitted ? 'bg-green-100 text-green-600' : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-primary group-hover:scale-110'}`}>
                      {isSubmitted ? <CheckCircle size={32} /> : <FileText size={32} />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                        <span className="bg-slate-100 px-3 py-1 rounded-full">{exam.subject}</span>
                        <span className="flex items-center gap-1"><Clock size={16} className="text-slate-400"/> {exam.timeLimitMinutes ? `${exam.timeLimitMinutes} دقيقة` : 'بدون وقت'}</span>
                        <span>{exam.questions.length} أسئلة</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => !isSubmitted && setActiveExam(exam)}
                    disabled={isSubmitted}
                    className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                      isSubmitted 
                        ? 'bg-green-100 text-green-700 cursor-default border-2 border-transparent' 
                        : 'bg-white border-2 border-slate-100 text-slate-700 hover:border-primary hover:bg-primary hover:text-white group-hover:shadow-lg'
                    }`}
                  >
                    {isSubmitted ? (
                      <>تم تقديم الامتحان <CheckCircle size={20} /></>
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