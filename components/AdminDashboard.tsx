import React, { useState, useEffect } from 'react';
import { User, Exam, UserRole } from '../types';
import { DbService } from '../services/firebase';
import { Users, BookOpen, Trash2, ShieldCheck, GraduationCap, Search, LayoutDashboard, Plus, Edit, AlertTriangle } from 'lucide-react';
import { ExamBuilder } from './ExamBuilder';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'exams'>('users');
  const [view, setView] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    type: 'user' | 'exam' | null;
    id: string | null;
    name?: string;
  }>({ show: false, type: null, id: null });

  const refreshData = async () => {
    setLoading(true);
    try {
      const [usersData, examsData] = await Promise.all([
        DbService.getAllUsers(),
        DbService.getAllExams()
      ]);
      setUsers(usersData);
      setExams(examsData);
    } catch (e) {
      console.error(e);
      // Removed native alert
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openDeleteModal = (type: 'user' | 'exam', id: string, name: string) => {
    setDeleteModal({ show: true, type, id, name });
  };

  const executeDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    try {
      if (deleteModal.type === 'user') {
        await DbService.deleteUser(deleteModal.id);
        setUsers(users.filter(u => u.id !== deleteModal.id));
      } else {
        await DbService.deleteExam(deleteModal.id);
        setExams(exams.filter(e => e.id !== deleteModal.id));
      }
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setDeleteModal({ show: false, type: null, id: null });
    }
  };

  const handleCreateClose = () => {
    setView('list');
    setEditingExam(null);
    refreshData();
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setView('create');
  };

  if (view === 'create') {
    return (
      <div className="p-6 h-[calc(100vh-80px)]">
        <ExamBuilder onClose={handleCreateClose} initialExam={editingExam} />
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.studentCode && u.studentCode.includes(searchTerm)) ||
    (u.teacherCode && u.teacherCode.includes(searchTerm))
  );

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    teachers: users.filter(u => u.role === UserRole.TEACHER).length,
    students: users.filter(u => u.role === UserRole.STUDENT).length,
    totalExams: exams.length,
    publishedExams: exams.filter(e => e.published).length
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
            <ShieldCheck className="text-yellow-600" size={32} /> لوحة تحكم المسؤول (Admin)
          </h1>
          <p className="text-slate-500">إدارة المستخدمين والامتحانات للنظام بالكامل.</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={20}/></div>
            <span className="text-slate-500 font-bold text-sm">إجمالي المستخدمين</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><BookOpen size={20}/></div>
            <span className="text-slate-500 font-bold text-sm">المعلمون</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800">{stats.teachers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><GraduationCap size={20}/></div>
            <span className="text-slate-500 font-bold text-sm">الطلاب</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800">{stats.students}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><LayoutDashboard size={20}/></div>
            <span className="text-slate-500 font-bold text-sm">الامتحانات</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800">{stats.totalExams}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs & Search */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              المستخدمين
            </button>
            <button 
              onClick={() => setActiveTab('exams')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'exams' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              الامتحانات
            </button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-10 text-center text-slate-500">جاري التحميل...</div>
          ) : activeTab === 'users' ? (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">البريد الإلكتروني</th>
                  <th className="px-6 py-4">الدور</th>
                  <th className="px-6 py-4">الكود / الصف</th>
                  <th className="px-6 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 
                        u.role === UserRole.TEACHER ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {u.role === UserRole.ADMIN ? 'مسؤول' : u.role === UserRole.TEACHER ? 'معلم' : 'طالب'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.role === UserRole.TEACHER && u.teacherCode && `كود: ${u.teacherCode}`}
                      {u.role === UserRole.STUDENT && (
                        <div>
                          <div className="text-xs">كود: {u.studentCode}</div>
                          <div className="text-xs text-slate-400">صف: {u.classroom}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role !== UserRole.ADMIN && (
                        <button 
                          onClick={() => openDeleteModal('user', u.id, u.name)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="حذف المستخدم"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">عنوان الامتحان</th>
                  <th className="px-6 py-4">المادة</th>
                  <th className="px-6 py-4">الصفوف</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{e.title}</td>
                    <td className="px-6 py-4 text-slate-600">{e.subject}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {e.targetClassrooms && e.targetClassrooms.map(c => (
                          <span key={c} className="bg-slate-100 px-2 py-0.5 rounded text-xs">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${e.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {e.published ? 'منشور' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditExam(e)}
                          className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="تعديل الامتحان"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal('exam', e.id, e.title)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="حذف الامتحان"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 mb-3">تأكيد الحذف</h3>
            <p className="text-center text-slate-600 mb-8 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف 
              <span className="font-bold text-slate-900 mx-1">
                {deleteModal.type === 'user' ? 'المستخدم' : 'الامتحان'} 
                {deleteModal.name ? ` (${deleteModal.name})` : ''}
              </span>
              نهائياً؟
              <br/>
              <span className="text-sm font-bold text-red-500 mt-2 block">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal({ show: false, type: null, id: null })}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={executeDelete}
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