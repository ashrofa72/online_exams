import React, { useState } from 'react';
import { Exam, Question, QuestionType } from '../types';
import { Plus, Trash2, Save, MoveUp, MoveDown, CheckCircle, FileText, Type, AlignLeft, X, AlertOctagon, School, PenLine } from 'lucide-react';
import { DbService, auth } from '../services/firebase';

interface ExamBuilderProps {
  onClose: () => void;
  initialExam?: Exam | null;
}

export const ExamBuilder: React.FC<ExamBuilderProps> = ({ onClose, initialExam }) => {
  const [title, setTitle] = useState(initialExam?.title || '');
  const [description, setDescription] = useState(initialExam?.description || '');
  const [subject, setSubject] = useState(initialExam?.subject || '');
  
  // New state for multiple classrooms
  const [targetClassrooms, setTargetClassrooms] = useState<string[]>(initialExam?.targetClassrooms || []);
  const [currentClassInput, setCurrentClassInput] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>(initialExam?.questions || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Safe ID generator helper
  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {
      // ignore
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const addClassroom = () => {
    if (currentClassInput.trim() && !targetClassrooms.includes(currentClassInput.trim())) {
      setTargetClassrooms([...targetClassrooms, currentClassInput.trim()]);
      setCurrentClassInput('');
    }
  };

  const removeClassroom = (cls: string) => {
    setTargetClassrooms(targetClassrooms.filter(c => c !== cls));
  };

  const handleClassInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addClassroom();
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: generateId(),
      type,
      text: '',
      marks: 1,
      options: type === QuestionType.MCQ ? ['', '', '', ''] : undefined,
      correctOptionIndex: type === QuestionType.MCQ ? 0 : undefined,
      correctAnswerText: '',
      keywords: []
    };
    setQuestions([...questions, newQ]);
    setError(''); // Clear error on action
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    
    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleSave = async (publish: boolean) => {
    setError('');
    
    if (!title || !subject) {
      setError("يرجى ملء البيانات الأساسية: العنوان والمادة.");
      return;
    }

    if (targetClassrooms.length === 0) {
      setError("يرجى إضافة صف دراسي واحد على الأقل.");
      return;
    }

    if (questions.length === 0) {
      setError("يجب إضافة سؤال واحد على الأقل للامتحان.");
      return;
    }

    // Validate questions content
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        setError(`السؤال رقم ${i + 1} لا يحتوي على نص.`);
        return;
      }
    }

    setSaving(true);
    const teacherId = auth.currentUser?.uid;
    
    if (!teacherId) {
      setError("انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.");
      setSaving(false);
      return;
    }
    
    try {
      const newExam: Exam = {
        id: initialExam?.id || generateId(),
        teacherId: teacherId,
        title,
        description,
        subject,
        targetClassrooms, // Send array
        questions,
        published: publish,
        createdAt: initialExam?.createdAt || new Date().toISOString()
      };

      await DbService.createExam(newExam);
      setSaving(false);
      onClose();
    } catch (e) {
      console.error(e);
      setError("حدث خطأ أثناء الحفظ في قاعدة البيانات.");
      setSaving(false);
    }
  };

  const getQuestionLabel = (type: QuestionType) => {
    switch(type) {
      case QuestionType.MCQ: return "اختيار من متعدد";
      case QuestionType.FILL_BLANK: return "أكمل الفراغ";
      case QuestionType.SHORT_ANSWER: return "إجابة قصيرة";
      case QuestionType.LONG_ANSWER: return "سؤال مقالي";
      default: return "";
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            {initialExam ? <PenLine size={24} /> : <Plus size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{initialExam ? 'تعديل الامتحان' : 'إنشاء امتحان جديد'}</h2>
            <p className="text-sm text-slate-500 font-medium">{initialExam ? 'قم بتحديث الأسئلة والإعدادات' : 'قم بتصميم الأسئلة وتحديد الإعدادات'}</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {error && (
            <div className="text-red-500 text-sm font-bold flex items-center gap-1 ml-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
              <AlertOctagon size={16} /> {error}
            </div>
          )}
          <button onClick={() => onClose()} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold">
            إلغاء
          </button>
          <button 
            onClick={() => handleSave(false)} 
            disabled={saving}
            className="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-bold"
          >
            حفظ كمسودة
          </button>
          <button 
            onClick={() => handleSave(true)} 
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2 font-bold disabled:opacity-70"
          >
            {saving ? 'جاري الحفظ...' : <><Save size={20} /> {initialExam && initialExam.published ? 'حفظ ونشر' : 'نشر الامتحان'}</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Settings */}
        <div className="w-80 md:w-96 border-l border-slate-100 p-6 overflow-y-auto bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-primary"/> تفاصيل الامتحان
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">عنوان الامتحان</label>
              <input 
                value={title} onChange={e => setTitle(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white" 
                placeholder="مثال: اختبار الفيزياء النصفي"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">الوصف / التعليمات</label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)} 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white" 
                rows={3}
                placeholder="تعليمات للطلاب..."
              />
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2">المادة</label>
               <input 
                 value={subject} onChange={e => setSubject(e.target.value)} 
                 className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white" 
                 placeholder="فيزياء"
               />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">الصفوف الدراسية المستهدفة</label>
              <div className="bg-white border border-slate-200 rounded-xl p-2 mb-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <div className="flex items-center gap-2">
                   <School size={18} className="text-slate-400 mr-2" />
                   <input 
                      value={currentClassInput} 
                      onChange={e => setCurrentClassInput(e.target.value)}
                      onKeyDown={handleClassInputKeyDown}
                      className="flex-1 outline-none text-sm py-2 bg-transparent"
                      placeholder="اكتب اسم الصف واضغط Enter (مثال: 10A)"
                    />
                    <button 
                      onClick={addClassroom}
                      disabled={!currentClassInput.trim()}
                      className="bg-slate-100 text-slate-600 hover:bg-primary hover:text-white p-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                </div>
              </div>
              
              {/* Chips */}
              <div className="flex flex-wrap gap-2 min-h-[30px]">
                {targetClassrooms.length === 0 && <span className="text-xs text-slate-400 italic">لم يتم تحديد صفوف بعد.</span>}
                {targetClassrooms.map(cls => (
                  <span key={cls} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    {cls}
                    <button onClick={() => removeClassroom(cls)} className="hover:text-red-500 transition-colors"><X size={14} /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-secondary"/> إضافة سؤال
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => addQuestion(QuestionType.MCQ)} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary hover:shadow-md transition-all text-sm font-bold text-slate-600">
                <CheckCircle size={18} /> اختيار من متعدد
              </button>
              <button onClick={() => addQuestion(QuestionType.FILL_BLANK)} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary hover:shadow-md transition-all text-sm font-bold text-slate-600">
                <Type size={18} /> أكمل الفراغ
              </button>
              <button onClick={() => addQuestion(QuestionType.SHORT_ANSWER)} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary hover:shadow-md transition-all text-sm font-bold text-slate-600">
                <AlignLeft size={18} /> إجابة قصيرة
              </button>
              <button onClick={() => addQuestion(QuestionType.LONG_ANSWER)} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:text-primary hover:shadow-md transition-all text-sm font-bold text-slate-600">
                <FileText size={18} /> سؤال مقالي
              </button>
            </div>
          </div>
        </div>

        {/* Question Canvas */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50 scrollbar-thin">
          {questions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="bg-slate-100 p-6 rounded-full mb-4">
                <Plus size={48} className="opacity-20 text-slate-600" />
              </div>
              <p className="text-lg font-medium">أضف أسئلة من القائمة الجانبية للبدء</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 p-6 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-50">
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold">
                      سؤال {idx + 1} - {getQuestionLabel(q.type)}
                    </span>
                    <div className="flex gap-2 text-slate-400">
                      <button onClick={() => moveQuestion(idx, 'up')} className="hover:text-primary p-1 hover:bg-slate-100 rounded"><MoveUp size={18} /></button>
                      <button onClick={() => moveQuestion(idx, 'down')} className="hover:text-primary p-1 hover:bg-slate-100 rounded"><MoveDown size={18} /></button>
                      <button onClick={() => removeQuestion(q.id)} className="hover:text-red-500 p-1 hover:bg-red-50 rounded mr-2"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <input 
                      value={q.text} 
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                      className="w-full text-lg font-bold border-b-2 border-slate-100 pb-2 focus:border-primary focus:outline-none bg-transparent placeholder-slate-300"
                      placeholder="اكتب نص السؤال هنا..."
                    />
                  </div>

                  {/* MCQ Specifics */}
                  {q.type === QuestionType.MCQ && (
                    <div className="space-y-3 mb-6">
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3 group">
                          <input 
                            type="radio" 
                            name={`correct-${q.id}`} 
                            checked={q.correctOptionIndex === optIdx} 
                            onChange={() => updateQuestion(q.id, { correctOptionIndex: optIdx })}
                            className="text-primary focus:ring-primary w-5 h-5 accent-primary cursor-pointer"
                            title="حدد كإجابة صحيحة"
                          />
                          <input 
                            value={opt} 
                            onChange={e => {
                              const newOptions = [...(q.options || [])];
                              newOptions[optIdx] = e.target.value;
                              updateQuestion(q.id, { options: newOptions });
                            }}
                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder={`الخيار ${optIdx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fill/Short Specifics */}
                  {(q.type === QuestionType.FILL_BLANK || q.type === QuestionType.SHORT_ANSWER) && (
                    <div className="mb-6 bg-green-50/50 p-4 rounded-xl border border-green-100">
                      <label className="block text-xs font-bold text-green-700 mb-2">الإجابة النموذجية (للتصحيح التلقائي)</label>
                      <input 
                        value={q.correctAnswerText || ''}
                        onChange={e => updateQuestion(q.id, { correctAnswerText: e.target.value })}
                        className="w-full px-4 py-2.5 border border-green-200 rounded-xl text-sm text-green-800 bg-white focus:ring-2 focus:ring-green-500/20 outline-none"
                        placeholder="اكتب الإجابة الصحيحة هنا"
                      />
                    </div>
                  )}

                  {/* Marks */}
                  <div className="flex justify-end items-center gap-3 pt-2">
                    <label className="text-sm font-bold text-slate-500">الدرجات:</label>
                    <input 
                      type="number" 
                      min="1"
                      value={q.marks}
                      onChange={e => updateQuestion(q.id, { marks: parseInt(e.target.value) || 1 })}
                      className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-center text-sm font-bold focus:border-primary outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};