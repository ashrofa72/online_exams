import React, { useState, useEffect } from 'react';
import { User, Exam } from '../types';
import { DbService } from '../services/firebase';
import { ExamBuilder } from './ExamBuilder';
import { ResultsView } from './ResultsView';
import { Plus, Book, Calendar, Users, Eye, EyeOff, LayoutDashboard, Trash2, Edit } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [view, setView] = useState<'list' | 'create' | 'results'>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  
  // State for editing
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{show: boolean, examId: string | null}>({ show: false, examId: null });

  const refreshExams = async () => {
    const data = await DbService.getExamsForTeacher(user.id);
    setExams(data);
  };

  useEffect(() => {
    refreshExams();
  }, [user.id]);

  const togglePublish = async (exam: Exam) => {
    await DbService.publishExam(exam.id, !exam.published);
    refreshExams();
  };

  const handleCreateClose = () => {
    setView('list');
    setEditingExam(null); // Clear editing state
    refreshExams();
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setView('create'); // Re-use create view which renders ExamBuilder
  };

  const handleViewResults = (exam: Exam) => {
    setSelectedExam(exam);
    setView('results');
  };

  const confirmDelete = async () => {
    if (deleteModal.examId) {
      await DbService.deleteExam(deleteModal.examId);
      setDeleteModal({ show: false, examId: null });
      refreshExams();
    }
  };

  if (view === 'create') {
    return (
      <div className="p-6 h-[calc(100vh-80px)]">
        <ExamBuilder onClose={handleCreateClose} initialExam={editingExam} />
      </div>
    );
  }
  
  if (view === 'results' && selectedExam) {
    return (
      <div className="p-6 h-[calc(100vh-80px)]">
        <ResultsView exam={selectedExam} onBack={() => setView('list')} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
             <LayoutDashboard className="text-primary" /> لوحة تحكم المعلم
          </h1>
          <p className="text-slate-500 text-lg">إدارة الامتحانات ومتابعة أداء الطلاب بسهولة</p>
        </div>
        <button 
          onClick={() => {
            setEditingExam(null);
            setView('create');
          }}
          className="bg-primary hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 font-bold transform hover:-translate-y-1"
        >
          <Plus size={22} /> إنشاء امتحان جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Book size={48} className="text-slate-300" />
             </div>
             <p className="text-slate-600 text-xl font-medium mb-2">لم تقم بإنشاء أي امتحانات بعد.</p>
             <p className="text-slate-400 mb-6">ابدأ بإنشاء اختبارات لطلابك الآن</p>
             <button onClick={() => setView('create')} className="text-primary hover:text-accent font-bold text-lg hover:underline underline-offset-4">ابدأ الآن &larr;</button>
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 p-6 flex flex-col group relative">
               <div className="flex justify-between items-start mb-5">
                 <div className="bg-indigo-50 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                   <Book size={24} />
                 </div>
                 <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${exam.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                   <span className={`w-2 h-2 rounded-full ${exam.published ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                   {exam.published ? 'منشور' : 'مسودة'}
                 </div>
               </div>
               
               <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{exam.title}</h3>
               <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{exam.description || 'لا يوجد وصف متاح.'}</p>
               
               <div className="space-y-3 mb-8">
                 <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                    <Users size={18} className="text-slate-400" /> 
                    <span>الصفوف: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">{exam.targetClassrooms ? exam.targetClassrooms.join(', ') : 'غير محدد'}</span></span>
                 </div>
                 <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                    <Calendar size={18} className="text-slate-400" />
                    <span>{new Date(exam.createdAt).toLocaleDateString('ar-EG')}</span>
                 </div>
               </div>

               <div className="mt-auto grid grid-cols-4 gap-2 pt-5 border-t border-slate-50">
                 <button 
                    onClick={() => togglePublish(exam)}
                    className={`col-span-1 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${exam.published ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    title={exam.published ? "إلغاء النشر" : "نشر"}
                 >
                   {exam.published ? <EyeOff size={16}/> : <Eye size={16}/>}
                 </button>
                 
                 <button 
                    onClick={() => handleEditExam(exam)}
                    className="col-span-1 py-2.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center"
                    title="تعديل"
                 >
                   <Edit size={16} />
                 </button>

                 <button 
                    onClick={() => handleViewResults(exam)}
                    className="col-span-1 py-2.5 text-xs font-bold rounded-xl bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-primary transition-colors flex items-center justify-center"
                    title="النتائج"
                 >
                   <LayoutDashboard size={16} />
                 </button>
                 
                 <button 
                    onClick={() => setDeleteModal({ show: true, examId: exam.id })}
                    className="col-span-1 py-2.5 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center"
                    title="حذف"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 mb-3">حذف الامتحان؟</h3>
            <p className="text-center text-slate-600 mb-8 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الامتحان نهائياً؟
              <br/>
              <span className="text-sm font-bold text-red-500">لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع النتائج المرتبطة به.</span>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal({ show: false, examId: null })}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
              >
                نعم، حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};