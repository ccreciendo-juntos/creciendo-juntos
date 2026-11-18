import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileText, 
  Settings, 
  BookOpen, 
  Bell, 
  Search, 
  ArrowRight,
  ShieldCheck,
  Save,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import type { StudentRecord } from './types';
import { INITIAL_STUDENTS } from './initialStudents';
import { RELIGION_AREA_NAME } from './religionCompetencies';
import { VeloxEvaluations } from './VeloxEvaluations';
import { VeloxAttendance } from './VeloxAttendance';
import { VeloxReports } from './VeloxReports';
import { VeloxStudents } from './VeloxStudents';

interface TeacherVeloxDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onReturnToPlatform?: () => void;
  // If user wants to see the original classroom materials & assignments
  originalClassroomsSection?: React.ReactNode;
}

export const TeacherVeloxDashboard: React.FC<TeacherVeloxDashboardProps> = ({
  user,
  onReturnToPlatform,
  originalClassroomsSection
}) => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'evaluations' | 'attendance' | 'reports' | 'classrooms' | 'settings'>('dashboard');

  // Active Grade and Section for teacher
  const [selectedGrade, setSelectedGrade] = useState<number>(4);
  const [selectedSection, setSelectedSection] = useState<string>('B');

  // Students state persisted in localStorage
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('velox_all_students_rel');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_STUDENTS;
  });

  // Save students to localStorage when changed
  const saveStudents = (newStudents: StudentRecord[]) => {
    setStudents(newStudents);
    try {
      localStorage.setItem('velox_all_students_rel', JSON.stringify(newStudents));
    } catch {
      // ignore
    }
  };

  const handleAddStudent = (st: StudentRecord) => {
    saveStudents([st, ...students]);
  };

  const handleUpdateStudent = (st: StudentRecord) => {
    saveStudents(students.map(s => s.id === st.id ? st : s));
  };

  const handleDeleteStudent = (id: string) => {
    saveStudents(students.filter(s => s.id !== id));
  };

  // Quick search in dashboard
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);

  // Profile fields state
  const [teacherProfile, setTeacherProfile] = useState(() => {
    return {
      name: user.name || 'Jose Ydrogo',
      email: user.email || 'docente@creciendojuntos.com',
      phone: '984512301'
    };
  });

  // Today's greeting string
  const greetingDate = useMemo(() => {
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} DE ${months[d.getMonth()]}`;
  }, []);

  const greetingTime = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Buenos días';
    if (hr < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // Quick student search results for dashboard
  const quickSearchResults = useMemo(() => {
    if (!dashboardSearch.trim()) return [];
    const q = dashboardSearch.toLowerCase();
    return students.filter(s => s.fullName.toLowerCase().includes(q) || s.dni.includes(q)).slice(0, 5);
  }, [students, dashboardSearch]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[85vh] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-xl font-sans">
      {/* VELOX SIDEBAR (Exact mirror of reference images) */}
      <aside className="w-full lg:w-64 bg-white border-r border-slate-200 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Velox Logo Branding */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/30">
              V
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">VELOX</span>
              <span className="text-[10px] text-blue-600 font-bold tracking-wider uppercase block">RegEva 2026 • Religión</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {/* 1. Inicio */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Inicio
            </button>

            {/* 2. Estudiantes */}
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" /> Estudiantes
            </button>

            {/* 3. Evaluaciones (Registro) */}
            <button
              type="button"
              onClick={() => setActiveTab('evaluations')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'evaluations'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Evaluaciones
            </button>

            {/* 4. Asistencia */}
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" /> Asistencia
            </button>

            {/* 5. Reportes */}
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Reportes
            </button>

            {/* 6. Aulas y Materiales Creciendo Juntos */}
            <button
              type="button"
              onClick={() => setActiveTab('classrooms')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'classrooms'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Aulas y Cuadernos
            </button>

            {/* 7. Configuración */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" /> Configuración
            </button>
          </nav>
        </div>

        {/* Bottom Classroom Selector Pill */}
        <div className="pt-4 border-t border-slate-150 space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aula Activa</span>
            <div className="flex items-center gap-2">
              <select
                value={`${selectedGrade}-${selectedSection}`}
                onChange={e => {
                  const [g, s] = e.target.value.split('-');
                  setSelectedGrade(parseInt(g));
                  setSelectedSection(s);
                }}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="4-B">4to B - Secundaria</option>
                <option value="1-A">1ro A - Secundaria</option>
                <option value="2-A">2do A - Secundaria</option>
                <option value="3-A">3ro A - Secundaria</option>
                <option value="5-A">5to A - Secundaria</option>
              </select>
            </div>
          </div>

          {onReturnToPlatform && (
            <button
              type="button"
              onClick={onReturnToPlatform}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 py-1 cursor-pointer"
            >
              ← Salir al Portal Principal
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[88vh]">
        {/* Top Header Bar */}
        <div className="flex justify-between items-center pb-6 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              🏫 I.E. 7053 Reino de España • UGEL 01
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
              ✝ {RELIGION_AREA_NAME}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2.5 bg-white py-1 px-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                {teacherProfile.name.charAt(0)}
              </div>
              <div className="text-left">
                <span className="block text-xs font-black text-slate-800 leading-tight">{teacherProfile.name}</span>
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">DOCENTE TITULAR</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: DASHBOARD / INICIO (Exact mirror of Image 2) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Big Welcome Banner (Image 2) */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-7 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="space-y-2">
                  <span className="inline-block bg-white/20 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full backdrop-blur-xs">
                    {greetingDate}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                    {greetingTime}, Docente
                  </h1>
                  <p className="text-xs md:text-sm text-blue-100 flex items-center gap-2 font-medium">
                    <span>🏫 7053 Reino de España</span>
                    <span>•</span>
                    <span>👤 {teacherProfile.name} ({RELIGION_AREA_NAME})</span>
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4 text-blue-600" /> Registrar Asistencia
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Student Search (Image 2) */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Consulta rápida de estudiante (Nombre o DNI)..."
                value={dashboardSearch}
                onChange={e => setDashboardSearch(e.target.value)}
                className="w-full bg-white text-xs pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {quickSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 space-y-1 animate-slide-up">
                  {quickSearchResults.map(st => (
                    <div 
                      key={st.id} 
                      onClick={() => {
                        setSelectedGrade(st.grade);
                        setSelectedSection(st.section);
                        setActiveTab('evaluations');
                        setDashboardSearch('');
                      }}
                      className="p-2.5 hover:bg-blue-50 rounded-xl cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-800">{st.fullName}</span>
                        <span className="text-[10px] text-slate-400 block">DNI: {st.dni} • Grado: {st.grade}° Sec "{st.section}"</span>
                      </div>
                      <span className="text-xs text-blue-600 font-bold flex items-center gap-1">Ver notas <ArrowRight className="w-3.5 h-3.5" /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4 Metric Cards (Image 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Mis Alumnos */}
              <div 
                onClick={() => setActiveTab('students')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-blue-100">Mis Alumnos</span>
                <span className="text-3xl font-black mt-1 block">{students.length}</span>
              </div>

              {/* Card 2: Asistencia Hoy */}
              <div 
                onClick={() => setActiveTab('attendance')}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-100">Asistencia Hoy</span>
                <span className="text-3xl font-black mt-1 block">94%</span>
              </div>

              {/* Card 3: En Riesgo de Falta */}
              <div 
                onClick={() => setActiveTab('attendance')}
                className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-6 rounded-2xl shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-rose-100">En Riesgo de Falta</span>
                <span className="text-3xl font-black mt-1 block">0</span>
              </div>

              {/* Card 4: Evaluaciones Registradas */}
              <div 
                onClick={() => setActiveTab('evaluations')}
                className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-2xl shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-purple-100">Evaluaciones Registradas</span>
                <span className="text-3xl font-black mt-1 block">73</span>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('evaluations')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-black text-slate-800 block group-hover:text-blue-600 transition-colors">
                    📝 Matriz de Evaluación
                  </span>
                  <span className="text-[11px] text-slate-500">Ingresar notas literales (A, B, C, AD)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-black text-slate-800 block group-hover:text-emerald-600 transition-colors">
                    📅 Control de Asistencia
                  </span>
                  <span className="text-[11px] text-slate-500">Pasar lista diaria P, F, T, J</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-black text-slate-800 block group-hover:text-indigo-600 transition-colors">
                    📑 Centro de Reportes PDF
                  </span>
                  <span className="text-[11px] text-slate-500">Descargar actas y consolidado MINEDU</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ESTUDIANTES */}
        {activeTab === 'students' && (
          <VeloxStudents
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
          />
        )}

        {/* TAB 3: EVALUACIONES */}
        {activeTab === 'evaluations' && (
          <VeloxEvaluations
            students={students}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
            onGradeChange={(g, s) => {
              setSelectedGrade(g);
              setSelectedSection(s);
            }}
          />
        )}

        {/* TAB 4: ASISTENCIA */}
        {activeTab === 'attendance' && (
          <VeloxAttendance
            students={students}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
          />
        )}

        {/* TAB 5: REPORTES */}
        {activeTab === 'reports' && (
          <VeloxReports
            students={students}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
            teacherName={teacherProfile.name}
          />
        )}

        {/* TAB 6: AULAS Y CUADERNOS (Creciendo Juntos original workspace) */}
        {activeTab === 'classrooms' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">Aulas Virtuales y Material Didáctico</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Acceso a cuadernos escolares interactivos, tareas y lecciones de Colección Creciendo Juntos.
                </p>
              </div>
            </div>
            {originalClassroomsSection}
          </div>
        )}

        {/* TAB 7: CONFIGURACIÓN (Exact mirror of Image 7) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Configuración</h2>
                <p className="text-xs text-slate-500 mt-1">Gestiona tu entorno y preferencias del sistema docente.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSaveProfileSuccess(true);
                  setTimeout(() => setSaveProfileSuccess(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" /> Guardar Todo
              </button>
            </div>

            {saveProfileSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Preferencias y datos de perfil guardados con éxito.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Submenu */}
              <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <button className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700">
                  👤 Mi Perfil
                </button>
                <button className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50">
                  🔔 Notificaciones
                </button>
                <button className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50">
                  🔒 Seguridad
                </button>
              </div>

              {/* Right Form Fields */}
              <div className="md:col-span-3 space-y-6">
                {/* Mi Perfil Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-sm pb-2 border-b border-slate-100">
                    <span className="w-2 h-4 bg-blue-600 rounded-full inline-block"></span> Mi Perfil
                  </div>
                  <p className="text-xs text-slate-500">Gestiona tu información personal en el sistema (teacher).</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={teacherProfile.name}
                        onChange={e => setTeacherProfile({ ...teacherProfile, name: e.target.value })}
                        className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={teacherProfile.email}
                        onChange={e => setTeacherProfile({ ...teacherProfile, email: e.target.value })}
                        className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={teacherProfile.phone}
                        onChange={e => setTeacherProfile({ ...teacherProfile, phone: e.target.value })}
                        className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Carga Académica Card (Image 7) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-sm pb-2 border-b border-slate-100">
                    <span className="w-2 h-4 bg-emerald-600 rounded-full inline-block"></span> Carga Académica
                  </div>
                  <p className="text-xs text-slate-500">Asigna las áreas y grados que tienes a tu cargo este año.</p>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                        ED
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">{RELIGION_AREA_NAME}</span>
                        <span className="text-[11px] text-slate-500">Grado y Sección: {selectedGrade}to {selectedSection}</span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      Vigente 2026
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
