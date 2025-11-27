import React, { useState } from 'react';
import { UserRole } from '../types';
import { AuthService } from '../services/firebase';
import { GraduationCap, BookOpen, LogIn, UserPlus, ShieldCheck, Mail, Lock, User, Hash, School } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [classroom, setClassroom] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await AuthService.login(email, password);
      } else {
        await AuthService.register(email, password, {
          name,
          role,
          studentCode: role === UserRole.STUDENT ? studentCode : undefined,
          teacherCode: role === UserRole.TEACHER ? teacherCode : undefined,
          classroom: role === UserRole.STUDENT ? classroom : undefined
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80')] bg-cover bg-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-sm"></div>
      
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20">
        <div className="bg-gradient-to-r from-primary to-accent p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="mx-auto bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner ring-1 ring-white/30">
            {role === UserRole.TEACHER ? <BookOpen size={40} className="text-white" /> : <GraduationCap size={40} className="text-white" />}
          </div>
          <h1 className="text-3xl font-bold mb-1">منصة امتحان التفوق</h1>
          <p className="text-indigo-100 text-lg opacity-90">
            {isLogin ? 'أهلاً بك مجدداً' : 'إنشاء حساب جديد'}
          </p>
        </div>

        <div className="p-8">
          {!isLogin && (
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8">
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${role === UserRole.STUDENT ? 'bg-white shadow-md text-primary scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setRole(UserRole.STUDENT)}
                type="button"
              >
                طالب
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${role === UserRole.TEACHER ? 'bg-white shadow-md text-primary scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setRole(UserRole.TEACHER)}
                type="button"
              >
                معلم
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="relative group">
                <User className="absolute right-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type="text"
                  required
                  className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute right-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="email"
                required
                className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white text-right"
                placeholder="البريد الإلكتروني"
                dir="rtl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute right-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="password"
                required
                className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && role === UserRole.TEACHER && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary"/> كود المعلم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                    placeholder="مثال: 717788"
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                  />
                </div>
                <p className="text-xs text-indigo-600 mt-2">
                  * يرجى إدخال الكود التعريفي الخاص بك والمزود من قبل إدارة المدرسة.
                </p>
              </div>
            )}

            {!isLogin && role === UserRole.STUDENT && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <Hash className="absolute right-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pr-10 pl-2 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="كود الطالب"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <School className="absolute right-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pr-10 pl-2 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="الصف الدراسي"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> جاري المعالجة...</span>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setTeacherCode('');
              }}
              className="text-sm text-primary hover:text-accent font-semibold transition-colors hover:underline underline-offset-4"
            >
              {isLogin ? "ليس لديك حساب؟ قم بالتسجيل الآن" : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};