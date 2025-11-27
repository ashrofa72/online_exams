import React, { useState, useEffect } from 'react';
import { Exam, Submission } from '../types';
import { DbService } from '../services/firebase';
import { Download, ChevronRight, Check, X, Award, BarChart3, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResultsViewProps {
  exam: Exam;
  onBack: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ exam, onBack }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const data = await DbService.getSubmissionsForExam(exam.id);
      setSubmissions(data);
      setLoading(false);
    };
    fetchSubmissions();
  }, [exam.id]);

  const handleManualGrade = async (submission: Submission, score: number) => {
    await DbService.updateSubmissionScore(submission.id, score);
    const updatedSubs = await DbService.getSubmissionsForExam(exam.id);
    setSubmissions(updatedSubs);
    const updatedSel = updatedSubs.find(s => s.id === submission.id);
    if (updatedSel) setSelectedSubmission(updatedSel);
  };

  const exportToCSV = () => {
    // Headers in Arabic
    const headers = ['اسم الامتحان', 'اسم الطالب', 'كود الطالب', 'المجموع', 'تاريخ التسليم'];
    
    // Map data to rows, adding quotes to handle commas/special chars within fields
    const rows = submissions.map(s => [
      `"${exam.title}"`,
      `"${s.studentName}"`,
      `"${s.studentCode}"`,
      s.totalScore.toString(),
      `"${new Date(s.submittedAt).toLocaleDateString('ar-EG')}"`
    ]);
    
    // Join everything with newlines
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Add BOM (Byte Order Mark) \uFEFF so Excel recognizes it as UTF-8 (Vital for Arabic)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exam.title}_النتائج.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Stats
  const avgScore = submissions.length ? (submissions.reduce((acc, s) => acc + s.totalScore, 0) / submissions.length).toFixed(1) : 0;
  const chartData = submissions.map(s => ({ name: s.studentName, score: s.totalScore }));

  if (selectedSubmission) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 h-full overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button onClick={() => setSelectedSubmission(null)} className="flex items-center gap-1 text-slate-600 hover:text-primary font-bold transition-colors">
            <ChevronRight size={22} /> العودة للقائمة
          </button>
          <div className="text-center">
            <h3 className="text-xl font-extrabold text-slate-800">{selectedSubmission.studentName}</h3>
            <span className="text-sm font-medium text-slate-500">{selectedSubmission.studentCode}</span>
          </div>
          <div className="bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-sm font-extrabold shadow-sm">
            المجموع: {selectedSubmission.totalScore}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
          {exam.questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between mb-3">
                <span className="font-bold text-slate-800 text-lg">س {idx + 1}. {q.text}</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">{q.marks} درجات</span>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl text-slate-800 mb-4 font-medium border border-slate-100">
                {selectedSubmission.answers[q.id] ? (
                  selectedSubmission.answers[q.id]
                ) : (
                  <span className="text-slate-400 italic">لا توجد إجابة</span>
                )}
              </div>

               <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                 <div className="text-sm text-slate-500 font-medium">
                   النوع: <span className="text-slate-700">{q.type}</span>
                 </div>
               </div>
            </div>
          ))}
          
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-8 rounded-2xl border border-indigo-100">
            <h4 className="font-bold text-lg text-indigo-900 mb-2">تصحيح يدوي / إضافي</h4>
            <p className="text-sm text-indigo-700 mb-6 font-medium">قم بتعديل الدرجة لإضافة درجات الأسئلة المقالية يدوياً.</p>
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl w-fit shadow-sm border border-indigo-100">
              <label className="text-sm font-bold text-slate-700">إضافة درجات يدوية:</label>
              <input 
                type="number" 
                value={selectedSubmission.manualScore}
                onChange={(e) => handleManualGrade(selectedSubmission, parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border rounded-lg text-center font-bold text-lg focus:border-primary outline-none text-primary"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
           <button onClick={onBack} className="text-sm text-slate-500 hover:text-primary mb-3 flex items-center gap-1 font-bold transition-colors"><ChevronRight size={18}/> العودة للوحة التحكم</button>
           <h2 className="text-3xl font-extrabold text-slate-900">نتائج الامتحان: <span className="text-primary">{exam.title}</span></h2>
        </div>
        <button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-green-200 transition-colors font-bold">
          <Download size={20} /> تصدير ملف Excel
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-3">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner"><Check size={24} /></div>
             <span className="text-slate-500 font-bold">عدد التسليمات</span>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">{submissions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-3">
             <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl shadow-inner"><Award size={24} /></div>
             <span className="text-slate-500 font-bold">متوسط الدرجات</span>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">{avgScore}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-3">
             <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-inner"><BarChart3 size={24} /></div>
             <span className="text-slate-500 font-bold">أعلى درجة</span>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">
            {Math.max(...submissions.map(s => s.totalScore), 0)}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-80 lg:h-auto">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-wider">توزيع الدرجات</h3>
            <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 11, fontFamily: 'Cairo'}} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
            </ResponsiveContainer>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                <tr>
                <th className="px-6 py-5">اسم الطالب</th>
                <th className="px-6 py-5">تاريخ التسليم</th>
                <th className="px-6 py-5 text-center">الدرجة الآلية</th>
                <th className="px-6 py-5 text-center">الدرجة الكلية</th>
                <th className="px-6 py-5 text-left">الإجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">لا توجد تسليمات حتى الآن.</td></tr>
                ) : (
                submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800">
                        <div>{sub.studentName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{sub.studentCode}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{new Date(sub.submittedAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{sub.autoScore}</td>
                    <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-extrabold">{sub.totalScore}</span>
                    </td>
                    <td className="px-6 py-4 text-left">
                        <button 
                        onClick={() => setSelectedSubmission(sub)}
                        className="text-primary hover:text-white hover:bg-primary font-bold text-xs border border-primary px-4 py-2 rounded-lg transition-all"
                        >
                        عرض وتصحيح
                        </button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
            </div>
        </div>
      </div>
    </div>
  );
};