import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  BarChart2,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import type { StudentRecord, GradeValue } from './types';
import { RELIGION_AREA_NAME, RELIGION_COMPETENCIES, calculateCompetencyAverage } from './religionCompetencies';
import { generateOfficialSectionPDF, generateOfficialSectionWord } from './veloxReportExports';
import { exportCurrentSectionExcel } from './veloxExcelExport';

interface VeloxReportsProps {
  students: StudentRecord[];
  selectedGrade: number;
  selectedSection: string;
  teacherName?: string;
  institutionName?: string;
}

export const VeloxReports: React.FC<VeloxReportsProps> = ({
  students,
  selectedGrade: initialGrade,
  selectedSection: initialSection,
  teacherName = 'Prof. Carlos Mendoza',
  institutionName = '7053 Reino de España',
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'analytics'>('documents');
  const [grade, setGrade] = useState<number>(initialGrade);
  const [section, setSection] = useState<string>(initialSection);
  const [bimestre, setBimestre] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [mesConsulta, setMesConsulta] = useState('Noviembre');
  const [isGenerating, setIsGenerating] = useState(false);

  const sectionStudents = useMemo(
    () => students.filter((s) => s.grade === grade && s.section === section),
    [students, grade, section]
  );

  const getSavedGradesForBim = (bim: 'I' | 'II' | 'III' | 'IV'): Record<string, Record<string, GradeValue>> => {
    try {
      const key = `velox_eval_rel_${grade}_${section}_${bim}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  };

  const allBimestresGrades = useMemo(
    () => ({
      I: getSavedGradesForBim('I'),
      II: getSavedGradesForBim('II'),
      III: getSavedGradesForBim('III'),
      IV: getSavedGradesForBim('IV'),
    }),
    [grade, section]
  );

  const currentGrades = useMemo(() => getSavedGradesForBim(bimestre), [grade, section, bimestre]);

  // Live analytics distribution from current grades
  const analyticsDistribution = useMemo(() => {
    const counts = { AD: 0, A: 0, B: 0, C: 0, total: 0 };
    sectionStudents.forEach((st) => {
      const stG = currentGrades[st.id] || {};
      RELIGION_COMPETENCIES.forEach((comp) => {
        const avg = calculateCompetencyAverage(comp.capacities.map((cap) => stG[cap.id] || ''));
        if (avg) {
          counts[avg]++;
          counts.total++;
        }
      });
    });
    const t = counts.total || 1;
    return {
      AD: counts.total ? Math.round((counts.AD / t) * 100) : 35,
      A: counts.total ? Math.round((counts.A / t) * 100) : 45,
      B: counts.total ? Math.round((counts.B / t) * 100) : 15,
      C: counts.total ? Math.round((counts.C / t) * 100) : 5,
    };
  }, [sectionStudents, currentGrades]);

  const handleDownloadSectionPDF = async () => {
    setIsGenerating(true);
    try {
      await generateOfficialSectionPDF({
        grade,
        section,
        bimestre,
        institutionName,
        teacherName,
        students: sectionStudents,
        grades: currentGrades,
        allBimestresGrades,
        attendancePct: 98,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSectionWord = async () => {
    setIsGenerating(true);
    try {
      await generateOfficialSectionWord({
        grade,
        section,
        bimestre,
        institutionName,
        teacherName,
        students: sectionStudents,
        grades: currentGrades,
        allBimestresGrades,
        attendancePct: 98,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAreaPDF = async () => {
    setIsGenerating(true);
    try {
      const gradeStudents = students.filter((s) => s.grade === grade);
      await generateOfficialSectionPDF({
        grade,
        section: 'Todas',
        bimestre,
        institutionName,
        teacherName,
        students: gradeStudents.length > 0 ? gradeStudents : sectionStudents,
        grades: currentGrades,
        allBimestresGrades,
        attendancePct: 98,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAreaWord = async () => {
    setIsGenerating(true);
    try {
      const gradeStudents = students.filter((s) => s.grade === grade);
      await generateOfficialSectionWord({
        grade,
        section: 'Todas',
        bimestre,
        institutionName,
        teacherName,
        students: gradeStudents.length > 0 ? gradeStudents : sectionStudents,
        grades: currentGrades,
        allBimestresGrades,
        attendancePct: 98,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadRegistroAuxiliarExcel = async () => {
    setIsGenerating(true);
    try {
      await exportCurrentSectionExcel({
        grade,
        section,
        bimestre,
        students: sectionStudents,
        grades: currentGrades,
        institutionName,
        teacherName,
        academicYear: '2026',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Blue/Indigo Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-600 p-6 md:p-7 rounded-2xl text-white shadow-lg">
        <h2 className="text-xl md:text-2xl font-black tracking-tight">Centro de Reportes Oficiales</h2>
        <p className="text-xs text-blue-100 mt-1 font-medium">
          Generación de documentos oficiales y análisis pedagógico con tecnología inteligente.
        </p>
      </div>

      {/* Main Content Layout (Matching Image 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filters Sidebar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Filtros de Configuración</h3>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grado</label>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1ro</option>
              <option value={2}>2do</option>
              <option value={3}>3ro</option>
              <option value={4}>4to</option>
              <option value={5}>5to</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sección</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              {['A', 'B', 'C', 'D', 'E'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Área Curricular</label>
            <div className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800">
              {RELIGION_AREA_NAME}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Periodo Académico</label>
            <select
              value={bimestre}
              onChange={(e) => setBimestre(e.target.value as 'I' | 'II' | 'III' | 'IV')}
              className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="I">1° Bimestre</option>
              <option value="II">2° Bimestre</option>
              <option value="III">3° Bimestre</option>
              <option value="IV">4° Bimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mes de Consulta</label>
            <select
              value={mesConsulta}
              onChange={(e) => setMesConsulta(e.target.value)}
              className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              {['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Tabs + Report Cards */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tabs Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" /> DOCUMENTOS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="w-4 h-4" /> ANÁLISIS
            </button>
          </div>

          {activeTab === 'documents' ? (
            <div className="space-y-4">
              {/* Card 1: Reporte de Sección (NIVEL 1: AULA & DOCENTE) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                    <h3 className="text-lg font-black text-slate-900">Reporte de Sección</h3>
                  </div>
                  <span className="inline-block text-[10px] font-black tracking-wider text-blue-600 uppercase">
                    NIVEL 1: AULA &amp; DOCENTE
                  </span>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    Análisis integral de los niveles de logro por cada competencia y capacidad. Perfecto para la atención personalizada de padres de familia.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadSectionPDF}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    PDF <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadSectionWord}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    WORD <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 2: Comparativo de Área (NIVEL 2: COORDINACIÓN) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-emerald-300 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                    <h3 className="text-lg font-black text-slate-900">Comparativo de Área</h3>
                  </div>
                  <span className="inline-block text-[10px] font-black tracking-wider text-emerald-600 uppercase">
                    NIVEL 2: COORDINACIÓN
                  </span>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    Evaluación estadística entre las diversas secciones del mismo grado educativo.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadAreaPDF}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    PDF <BarChart2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadAreaWord}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    WORD <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Registro Auxiliar — Exportación oficial en formato Excel (xlsx) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-teal-300 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 bg-teal-600 rounded-full"></span>
                    <h3 className="text-lg font-black text-slate-900">Registro Auxiliar</h3>
                  </div>
                  <span className="inline-block text-[10px] font-black tracking-wider text-teal-700 uppercase">
                    EXPORTACIÓN OFICIAL • FÓRMULAS &amp; A4 HORIZONTAL
                  </span>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    Exportación oficial en formato Excel (xlsx) con promedios por competencia, cuadro estadístico con fórmulas protegidas y formato listo para imprimir.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleDownloadRegistroAuxiliarExcel}
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    Registro Auxiliar (xlsx) <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-lg font-black text-slate-800">
                Distribución de Niveles de Logro ({RELIGION_AREA_NAME} • {grade}° "{section}")
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 text-center">
                  <span className="text-xs font-bold text-violet-700 block">AD (Destacado)</span>
                  <span className="text-3xl font-black text-violet-900 mt-1 block">{analyticsDistribution.AD}%</span>
                  <span className="text-[10px] text-violet-600">Supera los aprendizajes</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-xs font-bold text-emerald-700 block">A (Esperado)</span>
                  <span className="text-3xl font-black text-emerald-900 mt-1 block">{analyticsDistribution.A}%</span>
                  <span className="text-[10px] text-emerald-600">Alcanzó el estándar</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-xs font-bold text-amber-700 block">B (En Proceso)</span>
                  <span className="text-3xl font-black text-amber-900 mt-1 block">{analyticsDistribution.B}%</span>
                  <span className="text-[10px] text-amber-600">Requiere acompañamiento</span>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <span className="text-xs font-bold text-rose-700 block">C (En Inicio)</span>
                  <span className="text-3xl font-black text-rose-900 mt-1 block">{analyticsDistribution.C}%</span>
                  <span className="text-[10px] text-rose-600">En riesgo pedagógico</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
