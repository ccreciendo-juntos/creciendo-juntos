import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardList, HelpCircle, Plus, Search, 
  Clock, Award, CheckCircle2, Edit3, 
  Trash2, Eye, UserCheck, ChevronDown, Sparkles, 
  FileText
} from 'lucide-react';
import type { NovaActivity, NovaActivityType, NovaSubmission } from './types';
import { INITIAL_NOVA_ACTIVITIES } from './initialActivities';
import { NovaActivityEditor } from './NovaActivityEditor';
import { NovaQuizPlayer } from './NovaQuizPlayer';
import { NovaAssignmentView } from './NovaAssignmentView';

interface NovaClassworkManagerProps {
  role: 'docente' | 'estudiante' | 'admin' | 'super_admin';
  user: {
    id: string;
    name: string;
    email: string;
    grade?: number;
    section?: string;
  };
  activeClassroomGrade?: number;
  activeClassroomSection?: string;
}

const STORAGE_ACTIVITIES_KEY = 'creciendo_nova_activities_rel';
const STORAGE_SUBMISSIONS_KEY = 'creciendo_nova_submissions_rel';

export const NovaClassworkManager: React.FC<NovaClassworkManagerProps> = ({
  role,
  user,
  activeClassroomGrade = 4,
  activeClassroomSection = 'B'
}) => {
  const isTeacher = role === 'docente' || role === 'admin' || role === 'super_admin';

  // Activities State
  const [activities, setActivities] = useState<NovaActivity[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_NOVA_ACTIVITIES;
  });

  // Submissions State
  const [submissions, setSubmissions] = useState<NovaSubmission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'sub_demo_1',
        activity_id: 'act_rel_quiz_1',
        student_id: 'student_1',
        student_name: 'Estudiante Ejemplo (Carlos Mendoza)',
        student_dni: '74125896',
        grade: 4,
        section: 'B',
        submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: 'Calificado',
        score: 20,
        achievement_level: 'AD',
        teacher_feedback: '¡Excelente comprensión del Evangelio y de los valores morales cristianos!'
      },
      {
        id: 'sub_demo_2',
        activity_id: 'act_rel_assign_1',
        student_id: 'student_2',
        student_name: 'Ana María Quispe',
        student_dni: '72589631',
        grade: 4,
        section: 'B',
        submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        status: 'Entregado',
        evidence_text: 'En nuestra comunidad parroquial organizamos una campaña de recolección de útiles escolares inspirados en la parábola de los talentos.',
        evidence_link: 'https://docs.google.com/document/d/1demo-creciendo-juntos/edit',
        evidence_file_name: 'Proyecto_Solidario_AnaQuispe.pdf'
      }
    ];
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'quiz' | 'assignment'>('all');
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active modal views
  const [editingActivity, setEditingActivity] = useState<{ activity: NovaActivity | null; type: NovaActivityType } | null>(null);
  const [playingQuiz, setPlayingQuiz] = useState<NovaActivity | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<NovaActivity | null>(null);

  // Save activities to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error(e);
    }
  }, [activities]);

  // Save submissions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch (e) {
      console.error(e);
    }
  }, [submissions]);

  // Click outside create dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      // Search
      const matchSearch = act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          act.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // Type filter
      if (selectedTypeFilter !== 'all' && act.type !== selectedTypeFilter) {
        return false;
      }

      return true;
    });
  }, [activities, searchTerm, selectedTypeFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = activities.length;
    const quizzes = activities.filter(a => a.type === 'quiz').length;
    const assignments = activities.filter(a => a.type === 'assignment').length;
    const totalSubs = submissions.length;
    return { total, quizzes, assignments, totalSubs };
  }, [activities, submissions]);

  // Activity Handlers
  const handleSaveActivity = (savedActivity: NovaActivity) => {
    setActivities(prev => {
      const exists = prev.some(a => a.id === savedActivity.id);
      if (exists) {
        return prev.map(a => a.id === savedActivity.id ? savedActivity : a);
      }
      return [savedActivity, ...prev];
    });
    setEditingActivity(null);
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta actividad? Esta acción no se puede deshacer.')) {
      setActivities(prev => prev.filter(a => a.id !== id));
      setSubmissions(prev => prev.filter(s => s.activity_id !== id));
    }
  };

  const handleSaveSubmission = (submission: NovaSubmission) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === submission.id || (s.activity_id === submission.activity_id && s.student_id === submission.student_id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = submission;
        return next;
      }
      return [submission, ...prev];
    });
  };

  const handleGradeSubmission = (submissionId: string, score: number, level: 'AD' | 'A' | 'B' | 'C', feedback: string) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          score,
          achievement_level: level,
          teacher_feedback: feedback,
          status: 'Calificado'
        };
      }
      return s;
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Portal AIP NOVA 2026</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] text-emerald-400 font-medium">Sistema en línea</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Recursos Educativos y Actividades: <span className="text-blue-300">Educación Religiosa</span>
            </h2>
          </div>
        </div>

        {/* Action button: Crear actividad (Only for Teacher / Admin) */}
        {isTeacher && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Crear actividad
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </button>

            {/* Dropdown Menu matching Image 2 */}
            {showCreateDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
                <button
                  onClick={() => {
                    setEditingActivity({ activity: null, type: 'assignment' });
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-blue-50/80 rounded-xl transition-all text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Tarea Regular</p>
                    <p className="text-[10px] text-slate-500 font-medium">Evidencias de aprendizaje y proyectos</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setEditingActivity({ activity: null, type: 'quiz' });
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-indigo-50/80 rounded-xl transition-all text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Cuestionario</p>
                    <p className="text-[10px] text-slate-500 font-medium">Evaluación Tradicional interactiva</p>
                  </div>
                </button>

                <div className="h-px bg-slate-100 my-1"></div>

                <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Módulos Adicionales NOVA
                </div>

                <button
                  onClick={() => {
                    alert('Interactivo NOVA: Visualización interactiva activada para Educación Religiosa.');
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-slate-50 rounded-xl transition-all text-left group cursor-pointer opacity-70 hover:opacity-100"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    ✨
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Interactivo NOVA</p>
                    <p className="text-[9px] text-slate-400">PPT, Video y Lectura guiada</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    alert('Misión Gamificada NOVA: Activada para cuadernos Creciendo Juntos.');
                    setShowCreateDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-slate-50 rounded-xl transition-all text-left group cursor-pointer opacity-70 hover:opacity-100"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs">
                    🚀
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Misión Gamificada NOVA</p>
                    <p className="text-[9px] text-slate-400">Escape Room, ABP y retos</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Counter Cards Grid (Matching Image 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
            <p className="text-[11px] font-medium text-slate-500">Actividades Totales</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">{stats.quizzes}</p>
            <p className="text-[11px] font-medium text-slate-500">Cuestionarios</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">{stats.assignments}</p>
            <p className="text-[11px] font-medium text-slate-500">Tareas Regulares</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-800">{stats.totalSubs}</p>
            <p className="text-[11px] font-medium text-slate-500">Entregas de Alumnos</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título o contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedTypeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({activities.length})
          </button>

          <button
            onClick={() => setSelectedTypeFilter('quiz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedTypeFilter === 'quiz'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Cuestionarios ({stats.quizzes})
          </button>

          <button
            onClick={() => setSelectedTypeFilter('assignment')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedTypeFilter === 'assignment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Tareas Regulares ({stats.assignments})
          </button>
        </div>

      </div>

      {/* Activity Cards List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No se encontraron actividades</h3>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda o crea una nueva actividad.</p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isQuiz = act.type === 'quiz';
            const actSubmissions = submissions.filter(s => s.activity_id === act.id);
            const userSub = submissions.find(s => s.activity_id === act.id && (s.student_id === user.id || s.student_name.includes(user.name)));

            return (
              <div 
                key={act.id} 
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-5 md:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      isQuiz ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {isQuiz ? <HelpCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isQuiz ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {isQuiz ? 'Cuestionario' : 'Tarea Regular'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                          {act.grade}° Sec "{act.section}"
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Educación Religiosa
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800">{act.title}</h3>
                    </div>
                  </div>

                  {/* Badges / Points & Date */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {act.max_score || 20} pts
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {act.due_date ? new Date(act.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description excerpt */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>

                {/* Footer with Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Competencies indicators */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {act.competencies.map((c: string) => (
                      <span key={c} className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                        {c === 'rel_c1' ? 'C1: Conoce a Dios' : 'C2: Asume la fe'}
                      </span>
                    ))}
                    {isQuiz && act.questions && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-md">
                        {act.questions.length} preguntas
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    
                    {/* DOCENTE ACTIONS */}
                    {isTeacher ? (
                      <>
                        <button
                          onClick={() => {
                            if (isQuiz) {
                              setPlayingQuiz(act);
                            } else {
                              setViewingAssignment(act);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Vista Previa de la Actividad"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Previsualizar</span>
                        </button>

                        {!isQuiz && (
                          <button
                            onClick={() => setViewingAssignment(act)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Entregas ({actSubmissions.length})</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingActivity({ activity: act, type: act.type })}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      /* ESTUDIANTE ACTIONS */
                      <>
                        {userSub ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {userSub.status === 'Calificado' 
                                ? `Nota: ${userSub.score}/20 (${userSub.achievement_level})` 
                                : 'Entregado'}
                            </span>

                            <button
                              onClick={() => {
                                if (isQuiz) {
                                  setPlayingQuiz(act);
                                } else {
                                  setViewingAssignment(act);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              Ver Mi Entrega
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (isQuiz) {
                                setPlayingQuiz(act);
                              } else {
                                setViewingAssignment(act);
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isQuiz ? <HelpCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                            <span>{isQuiz ? 'Resolver Cuestionario' : 'Entregar Tarea'}</span>
                          </button>
                        )}
                      </>
                    )}

                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: NovaActivityEditor */}
      {editingActivity && (
        <NovaActivityEditor
          initialActivity={editingActivity.activity}
          activityType={editingActivity.type}
          defaultGrade={activeClassroomGrade}
          defaultSection={activeClassroomSection}
          onSave={handleSaveActivity}
          onCancel={() => setEditingActivity(null)}
        />
      )}

      {/* MODAL 2: NovaQuizPlayer */}
      {playingQuiz && (
        <NovaQuizPlayer
          activity={playingQuiz}
          student={{
            id: user.id,
            name: user.name,
            email: user.email
          }}
          onComplete={(submission) => {
            handleSaveSubmission(submission);
          }}
          onClose={() => setPlayingQuiz(null)}
        />
      )}

      {/* MODAL 3: NovaAssignmentView */}
      {viewingAssignment && (
        <NovaAssignmentView
          activity={viewingAssignment}
          currentUser={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: role,
            grade: activeClassroomGrade,
            section: activeClassroomSection
          }}
          existingSubmission={submissions.find(s => s.activity_id === viewingAssignment.id && (s.student_id === user.id || s.student_name.includes(user.name)))}
          allSubmissions={submissions.filter(s => s.activity_id === viewingAssignment.id)}
          onSaveSubmission={handleSaveSubmission}
          onGradeSubmission={handleGradeSubmission}
          onClose={() => setViewingAssignment(null)}
        />
      )}

    </div>
  );
};
