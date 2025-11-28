import React, { useState, useEffect } from 'react';
import { AuthService, DbService, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole } from './types';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LogOut, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProfile = await DbService.getUserProfile(firebaseUser.uid);
          setUser(userProfile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-primary bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  if (!user) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="bg-gradient-to-br from-primary to-accent text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
             <Sun size={24} />
           </div>
           <span className="font-bold text-xl tracking-tight text-slate-800">منصة امتحان التفوق</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500 font-medium">
              {user.role === UserRole.ADMIN ? 'مسؤول النظام' : user.role === UserRole.TEACHER ? 'معلم' : 'طالب'} 
              {user.role === UserRole.STUDENT && ` • ${user.classroom}`}
            </p>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
            title="تسجيل الخروج"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </nav>

      <main>
        {user.role === UserRole.ADMIN ? (
          <AdminDashboard />
        ) : user.role === UserRole.TEACHER ? (
          <TeacherDashboard user={user} />
        ) : (
          <StudentDashboard user={user} />
        )}
      </main>
    </div>
  );
};

export default App;