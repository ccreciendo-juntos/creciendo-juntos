import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Save, Download, Upload, Search, CheckCircle2 } from 'lucide-react';
import type { StudentRecord, GradeValue } from './types';
import { 
  RELIGION_AREA_NAME, 
  RELIGION_COMPETENCIES, 
  TRANSVERSAL_COMPETENCIES, 
  calculateCompetencyAverage, 
  calculateFinalGrade, 
  getGradeBadgeClass,
  getGradeTextClass 
} from './religionCompetencies';

interface VeloxEvaluationsProps {
  students: StudentRecord[];
  selectedGrade: number;
  selectedSection: string;
  onGradeChange?: (grade: number, section: string) => void;
}

export const VeloxEvaluations: React.FC<VeloxEvaluationsProps> = ({
  students,
  selectedGrade,
  selectedSection,
}) => {
  const [bimestre, setBimestre] = useState<'I' | 'II' | 'III' | 'IV'>('IV');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransversals, setShowTransversals] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Storage key based on grade, section and bimestre
  const storageKey = `velox_eval_rel_${selectedGrade}_${selectedSection}_${bimestre}`;

  // Grades state: record of studentId -> { capacityId -> GradeValue }
  const [grades, setGrades] = useState<Record<string, Record<string, GradeValue>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Seed initial mock evaluations for 4to B to match reference image
    const initial: Record<string, Record<string, GradeValue>> = {};
    if (selectedGrade === 4 && selectedSection === 'B') {
      initial['est_4b_1'] = { rel_c1_cap1: 'C', rel_c1_cap2: 'C', rel_c2_cap1: '', rel_c2_cap2: '' };
      initial['est_4b_2'] = { rel_c1_cap1: 'A', rel_c1_cap2: 'A', rel_c2_cap1: '', rel_c2_cap2: '' };
      initial['est_4b_3'] = { rel_c1_cap1: 'B', rel_c1_cap2: 'B', rel_c2_cap1: '', rel_c2_cap2: '' };
      initial['est_4b_4'] = { rel_c1_cap1: 'AD', rel_c1_cap2: 'A', rel_c2_cap1: 'A', rel_c2_cap2: 'A' };
      initial['est_4b_5'] = { rel_c1_cap1: 'B', rel_c1_cap2: 'B', rel_c2_cap1: 'B', rel_c2_cap2: 'A' };
    }
    return initial;
  });

  // Reload grades when grade, section, or bimestre changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setGrades(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }
    // Default empty if none stored
    setGrades({});
  }, [storageKey]);

  // Filter students by current grade, section, and search query
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = s.grade === selectedGrade && s.section === selectedSection;
      if (!matchClass) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.dni.includes(q);
    });
  }, [students, selectedGrade, selectedSection, searchQuery]);

  // Calculate progress (% of students with at least one evaluation)
  const progressStats = useMemo(() => {
    if (filteredStudents.length === 0) return { percent: 0, count: 0, total: 0 };
    let evaluatedCount = 0;
    filteredStudents.forEach(st => {
      const stGrades = grades[st.id] || {};
      const hasAny = Object.values(stGrades).some(g => g !== '');
      if (hasAny) evaluatedCount++;
    });
    const percent = Math.round((evaluatedCount / filteredStudents.length) * 100);
    return { percent, count: evaluatedCount, total: filteredStudents.length };
  }, [filteredStudents, grades]);

  // Update a single cell grade
  const handleCellChange = useCallback((studentId: string, capacityId: string, val: GradeValue) => {
    setGrades(prev => {
      const stObj = { ...(prev[studentId] || {}) };
      stObj[capacityId] = val;
      return { ...prev, [studentId]: stObj };
    });
  }, []);

  // Save evaluations
  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(grades));
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (e) {
      alert('Error guardando en el navegador: ' + e);
    }
  };

  // Keyboard and paste navigation helper
  const tableRef = useRef<HTMLTableElement>(null);

  const handlePasteAcrossCells = (e: React.ClipboardEvent<HTMLInputElement>, startStudentIdx: number, startCapId: string) => {
    e.preventDefault();
    const clipText = e.clipboardData.getData('text/plain');
    if (!clipText) return;

    const rows = clipText.split(/\r?\n/).filter(r => r.trim());
    if (rows.length === 0) return;

    // Ordered list of capacity IDs in display order
    const orderedCapIds: string[] = [];
    RELIGION_COMPETENCIES.forEach(comp => comp.capacities.forEach(cap => orderedCapIds.push(cap.id)));
    if (showTransversals) {
      TRANSVERSAL_COMPETENCIES.forEach(comp => comp.capacities.forEach(cap => orderedCapIds.push(cap.id)));
    }

    const startCapIdx = orderedCapIds.indexOf(startCapId);
    if (startCapIdx === -1) return;

    setGrades(prev => {
      const next = { ...prev };
      rows.forEach((rowStr, rOffset) => {
        const student = filteredStudents[startStudentIdx + rOffset];
        if (!student) return;

        const cellVals = rowStr.split('\t');
        const stObj = { ...(next[student.id] || {}) };

        cellVals.forEach((rawVal, cOffset) => {
          const targetCapId = orderedCapIds[startCapIdx + cOffset];
          if (!targetCapId) return;
          const clean = rawVal.trim().toUpperCase();
          if (clean === 'AD' || clean === 'A' || clean === 'B' || clean === 'C') {
            stObj[targetCapId] = clean;
          } else if (clean === '' || clean === '-') {
            stObj[targetCapId] = '';
          }
        });
        next[student.id] = stObj;
      });
      return next;
    });
  };

  // Export current table to Excel format (.xls compatible)
  const exportToExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #999; padding: 6px; text-align: center; }
          .header-main { background-color: #004D40; color: white; font-weight: bold; }
          .c1-hdr { background-color: #2563EB; color: white; }
          .c2-hdr { background-color: #EA580C; color: white; }
          .logro { background-color: #FEF3C7; font-weight: bold; }
          .logro-final { background-color: #F97316; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>REGISTRO AUXILIAR DE EVALUACIÓN - ÁREA DE EDUCACIÓN RELIGIOSA 2026</h2>
        <p><strong>Grado:</strong> ${selectedGrade}° de Secundaria | <strong>Sección:</strong> "${selectedSection}" | <strong>Bimestre:</strong> ${bimestre} Bimestre</p>
        <table>
          <thead>
            <tr>
              <th rowspan="2">N°</th>
              <th rowspan="2">DNI</th>
              <th rowspan="2">Apellidos y Nombres</th>
              <th colspan="3" class="c1-hdr">Construye su identidad como persona humana...</th>
              <th colspan="3" class="c2-hdr">Asume la experiencia del encuentro con Dios...</th>
              <th rowspan="2" class="logro-final">LOGRO FINAL</th>
            </tr>
            <tr>
              <th>Cap 1</th>
              <th>Cap 2</th>
              <th class="logro">LOGRO</th>
              <th>Cap 1</th>
              <th>Cap 2</th>
              <th class="logro">LOGRO</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredStudents.forEach((st, idx) => {
      const stGrades = grades[st.id] || {};
      const c1Cap1 = stGrades['rel_c1_cap1'] || '';
      const c1Cap2 = stGrades['rel_c1_cap2'] || '';
      const c1Logro = calculateCompetencyAverage([c1Cap1, c1Cap2]);

      const c2Cap1 = stGrades['rel_c2_cap1'] || '';
      const c2Cap2 = stGrades['rel_c2_cap2'] || '';
      const c2Logro = calculateCompetencyAverage([c2Cap1, c2Cap2]);

      const finalGrade = calculateFinalGrade([c1Logro, c2Logro]);

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${st.dni}</td>
          <td style="text-align: left;">${st.fullName}</td>
          <td>${c1Cap1}</td>
          <td>${c1Cap2}</td>
          <td class="logro"><strong>${c1Logro}</strong></td>
          <td>${c2Cap1}</td>
          <td>${c2Cap2}</td>
          <td class="logro"><strong>${c2Logro}</strong></td>
          <td class="logro-final"><strong>${finalGrade}</strong></td>
        </tr>
      `;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registro_Evaluacion_Religiosa_${selectedGrade}${selectedSection}_${bimestre}Bimestre.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Evaluación</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            <strong className="text-blue-700">Área: {RELIGION_AREA_NAME}</strong> • Escribe <span className="font-bold text-slate-700">A, B, C o AD</span> • Tab/Flechas para navegar • <span className="text-indigo-600 font-semibold">Ctrl+V para pegar desde Excel</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccessMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ¡Guardado correctamente!
            </span>
          )}

          <button 
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Exportar Actual (Excel)
          </button>

          <button 
            type="button"
            onClick={() => {
              const pasted = prompt("Pegue aquí los datos copiados desde Excel (separados por tabulación):");
              if (pasted && filteredStudents[0]) {
                const fakeEvent = {
                  preventDefault: () => {},
                  clipboardData: { getData: () => pasted }
                } as unknown as React.ClipboardEvent<HTMLInputElement>;
                handlePasteAcrossCells(fakeEvent, 0, 'rel_c1_cap1');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" /> Importar desde Excel
          </button>

          <button 
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Guardar Notas
          </button>
        </div>
      </div>

      {/* Filters & Control Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Área Curricular</label>
          <div className="form-control text-xs font-bold text-blue-900 bg-blue-50/60 border border-blue-200 py-2 px-3 rounded-xl">
            ✝ {RELIGION_AREA_NAME}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bimestre</label>
          <select 
            value={bimestre} 
            onChange={e => setBimestre(e.target.value as any)}
            className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="I">I Bimestre</option>
            <option value="II">II Bimestre</option>
            <option value="III">III Bimestre</option>
            <option value="IV">IV Bimestre</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Grado y Sección</label>
          <div className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-slate-50 text-slate-700">
            {selectedGrade}° de Secundaria - Sección "{selectedSection}"
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Buscar Alumno</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Nombre o DNI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control text-xs pl-8 py-2 rounded-xl border border-slate-300 w-full focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar Ribbon */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-600">Progreso de Registro:</span>
          <div className="w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressStats.percent}%` }}
            ></div>
          </div>
          <span className="text-xs font-extrabold text-blue-700">{progressStats.percent}% ({progressStats.count} de {progressStats.total} est.)</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
            <input 
              type="checkbox" 
              checked={showTransversals} 
              onChange={e => setShowTransversals(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            Mostrar Competencias Transversales (TIC y Autonomía)
          </label>
        </div>
      </div>

      {/* EVALUATION SPREADSHEET MATRIX (Exact mirror of Velox reference) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] no-scrollbar">
          <table ref={tableRef} className="w-full border-collapse text-xs select-none">
            <thead>
              {/* LEVEL 1 HEADER: Competencies and Major Categories */}
              <tr className="text-white text-center font-extrabold text-[11px] uppercase tracking-wide">
                <th className="bg-[#1e3a8a] text-white px-4 py-3 sticky left-0 z-20 min-w-[240px] text-left border-r border-blue-900 shadow-md">
                  LISTA MAESTRA DE ESTUDIANTES
                </th>

                {/* Competencia 1: Construye su identidad */}
                <th colSpan={3} className="bg-[#2563eb] px-3 py-2.5 border-r border-blue-400">
                  <div className="line-clamp-2 max-w-[280px] mx-auto text-[10px] leading-tight">
                    CONSTRUYE SU IDENTIDAD COMO PERSONA HUMANA, AMADA POR DIOS...
                  </div>
                </th>

                {/* Competencia 2: Asume la experiencia */}
                <th colSpan={3} className="bg-[#ea580c] px-3 py-2.5 border-r border-orange-400">
                  <div className="line-clamp-2 max-w-[280px] mx-auto text-[10px] leading-tight">
                    ASUME LA EXPERIENCIA DEL ENCUENTRO PERSONAL Y COMUNITARIO CON DIOS...
                  </div>
                </th>

                {/* Columna LOGRO FINAL */}
                <th rowSpan={2} className="bg-[#f97316] text-white px-3 py-2 font-black text-center min-w-[70px] border-r border-orange-600 shadow-sm">
                  LOGRO FINAL
                </th>

                {/* Transversales */}
                {showTransversals && (
                  <>
                    <th colSpan={5} className="bg-[#475569] px-3 py-2 border-r border-slate-600 text-[10px]">
                      SE DESENVUELVE EN ENTORNOS VIRTUALES GENERADOS POR LAS TIC
                    </th>
                    <th colSpan={4} className="bg-[#334155] px-3 py-2 border-r border-slate-600 text-[10px]">
                      GESTIONA SU APRENDIZAJE DE MANERA AUTÓNOMA
                    </th>
                  </>
                )}
              </tr>

              {/* LEVEL 2 HEADER: Capacities + Logro Columns */}
              <tr className="bg-slate-100 text-slate-800 text-center font-bold text-[9px] uppercase border-b border-slate-300">
                <th className="bg-slate-200 sticky left-0 z-20 px-4 py-2 text-left text-slate-700 border-r border-slate-300">
                  N° • APELLIDOS Y NOMBRES
                </th>

                {/* C1 Capacities */}
                <th className="p-1.5 w-[75px] bg-blue-50 text-blue-950 border-r border-slate-200 font-semibold" title="Conoce a Dios y asume su identidad religiosa y espiritual">
                  <div className="line-clamp-3 leading-tight">Conoce a Dios...</div>
                </th>
                <th className="p-1.5 w-[75px] bg-blue-50 text-blue-950 border-r border-slate-200 font-semibold" title="Cultiva y valora las manifestaciones religiosas">
                  <div className="line-clamp-3 leading-tight">Cultiva y valora...</div>
                </th>
                <th className="p-1.5 w-[65px] bg-blue-100 text-blue-900 border-r-2 border-blue-400 font-black">
                  LOGRO C1
                </th>

                {/* C2 Capacities */}
                <th className="p-1.5 w-[75px] bg-orange-50 text-orange-950 border-r border-slate-200 font-semibold" title="Transforma su entorno desde el encuentro con Dios">
                  <div className="line-clamp-3 leading-tight">Transforma entorno...</div>
                </th>
                <th className="p-1.5 w-[75px] bg-orange-50 text-orange-950 border-r border-slate-200 font-semibold" title="Actúa coherentemente en razón de su fe">
                  <div className="line-clamp-3 leading-tight">Actúa en fe...</div>
                </th>
                <th className="p-1.5 w-[65px] bg-orange-100 text-orange-900 border-r-2 border-orange-400 font-black">
                  LOGRO C2
                </th>

                {/* Transversal 1 Capacities */}
                {showTransversals && (
                  <>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Personaliza</th>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Gestiona</th>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Interactúa</th>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Crea obj.</th>
                    <th className="p-1.5 w-[60px] bg-slate-200 font-black border-r border-slate-300">LOGRO</th>

                    {/* Transversal 2 Capacities */}
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Metas</th>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Estrategias</th>
                    <th className="p-1.5 w-[65px] bg-slate-50 border-r border-slate-200">Monitorea</th>
                    <th className="p-1.5 w-[60px] bg-slate-200 font-black border-r border-slate-300">LOGRO</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={showTransversals ? 17 : 8} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron estudiantes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const stGrades = grades[st.id] || {};

                  // Competency 1 calculations
                  const c1Cap1 = stGrades['rel_c1_cap1'] || '';
                  const c1Cap2 = stGrades['rel_c1_cap2'] || '';
                  const c1Logro = calculateCompetencyAverage([c1Cap1, c1Cap2]);

                  // Competency 2 calculations
                  const c2Cap1 = stGrades['rel_c2_cap1'] || '';
                  const c2Cap2 = stGrades['rel_c2_cap2'] || '';
                  const c2Logro = calculateCompetencyAverage([c2Cap1, c2Cap2]);

                  // Final Grade
                  const finalGrade = calculateFinalGrade([c1Logro, c2Logro]);

                  // Transversal 1
                  const t1Cap1 = stGrades['trans_c1_cap1'] || '';
                  const t1Cap2 = stGrades['trans_c1_cap2'] || '';
                  const t1Cap3 = stGrades['trans_c1_cap3'] || '';
                  const t1Cap4 = stGrades['trans_c1_cap4'] || '';
                  const t1Logro = calculateCompetencyAverage([t1Cap1, t1Cap2, t1Cap3, t1Cap4]);

                  // Transversal 2
                  const t2Cap1 = stGrades['trans_c2_cap1'] || '';
                  const t2Cap2 = stGrades['trans_c2_cap2'] || '';
                  const t2Cap3 = stGrades['trans_c2_cap3'] || '';
                  const t2Logro = calculateCompetencyAverage([t2Cap1, t2Cap2, t2Cap3]);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Student info cell (sticky left) */}
                      <td className="sticky left-0 bg-white z-10 px-4 py-2 border-r border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-extrabold text-[11px] text-slate-800 uppercase block truncate">
                              {st.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {st.dni}</span>
                          </div>
                        </div>
                      </td>

                      {/* C1 Capacities Input Cells */}
                      <td className="p-1 border-r border-slate-200 text-center">
                        <GradeSelect 
                          value={c1Cap1} 
                          onChange={v => handleCellChange(st.id, 'rel_c1_cap1', v)} 
                          onPaste={e => handlePasteAcrossCells(e, idx, 'rel_c1_cap1')}
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-center">
                        <GradeSelect 
                          value={c1Cap2} 
                          onChange={v => handleCellChange(st.id, 'rel_c1_cap2', v)} 
                          onPaste={e => handlePasteAcrossCells(e, idx, 'rel_c1_cap2')}
                        />
                      </td>
                      {/* Logro C1 Badge */}
                      <td className="p-1 border-r-2 border-blue-400 text-center bg-blue-50/60">
                        <span className={`inline-block w-8 py-1 rounded text-xs font-black ${getGradeBadgeClass(c1Logro)}`}>
                          {c1Logro || '-'}
                        </span>
                      </td>

                      {/* C2 Capacities Input Cells */}
                      <td className="p-1 border-r border-slate-200 text-center">
                        <GradeSelect 
                          value={c2Cap1} 
                          onChange={v => handleCellChange(st.id, 'rel_c2_cap1', v)} 
                          onPaste={e => handlePasteAcrossCells(e, idx, 'rel_c2_cap1')}
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-center">
                        <GradeSelect 
                          value={c2Cap2} 
                          onChange={v => handleCellChange(st.id, 'rel_c2_cap2', v)} 
                          onPaste={e => handlePasteAcrossCells(e, idx, 'rel_c2_cap2')}
                        />
                      </td>
                      {/* Logro C2 Badge */}
                      <td className="p-1 border-r-2 border-orange-400 text-center bg-orange-50/60">
                        <span className={`inline-block w-8 py-1 rounded text-xs font-black ${getGradeBadgeClass(c2Logro)}`}>
                          {c2Logro || '-'}
                        </span>
                      </td>

                      {/* LOGRO FINAL COLUMN */}
                      <td className="p-1 border-r border-orange-500 text-center bg-orange-100/50">
                        <span className={`inline-block w-9 py-1 rounded text-xs font-black shadow-xs ${getGradeBadgeClass(finalGrade)}`}>
                          {finalGrade || '-'}
                        </span>
                      </td>

                      {/* Transversals */}
                      {showTransversals && (
                        <>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t1Cap1} onChange={v => handleCellChange(st.id, 'trans_c1_cap1', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t1Cap2} onChange={v => handleCellChange(st.id, 'trans_c1_cap2', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t1Cap3} onChange={v => handleCellChange(st.id, 'trans_c1_cap3', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t1Cap4} onChange={v => handleCellChange(st.id, 'trans_c1_cap4', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-300 text-center bg-slate-100">
                            <span className={`inline-block w-7 py-0.5 rounded text-[11px] font-bold ${getGradeBadgeClass(t1Logro)}`}>
                              {t1Logro || '-'}
                            </span>
                          </td>

                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t2Cap1} onChange={v => handleCellChange(st.id, 'trans_c2_cap1', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t2Cap2} onChange={v => handleCellChange(st.id, 'trans_c2_cap2', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-200 text-center">
                            <GradeSelect value={t2Cap3} onChange={v => handleCellChange(st.id, 'trans_c2_cap3', v)} />
                          </td>
                          <td className="p-1 border-r border-slate-300 text-center bg-slate-100">
                            <span className={`inline-block w-7 py-0.5 rounded text-[11px] font-bold ${getGradeBadgeClass(t2Logro)}`}>
                              {t2Logro || '-'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Custom keyboard-friendly grade select input
interface GradeSelectProps {
  value: GradeValue;
  onChange: (val: GradeValue) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

const GradeSelect: React.FC<GradeSelectProps> = ({ value, onChange, onPaste }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key.toUpperCase();
    if (k === 'A') {
      e.preventDefault();
      // Allow fast double tap for AD
      onChange(value === 'A' ? 'AD' : 'A');
    } else if (k === 'D' && value === 'A') {
      e.preventDefault();
      onChange('AD');
    } else if (k === 'B') {
      e.preventDefault();
      onChange('B');
    } else if (k === 'C') {
      e.preventDefault();
      onChange('C');
    } else if (k === 'BACKSPACE' || k === 'DELETE') {
      e.preventDefault();
      onChange('');
    }
  };

  return (
    <input 
      type="text"
      readOnly
      value={value}
      placeholder="-"
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
      onClick={() => {
        // Toggle cycle on click: '' -> A -> B -> C -> AD -> ''
        const cycle: Record<string, GradeValue> = { '': 'A', A: 'B', B: 'C', C: 'AD', AD: '' };
        onChange(cycle[value] || 'A');
      }}
      className={`w-10 h-7 text-center rounded border text-xs font-black cursor-pointer transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none ${
        value ? 'bg-white shadow-2xs ' + getGradeTextClass(value) : 'bg-slate-50 text-slate-300 border-slate-200 hover:border-slate-300'
      }`}
    />
  );
};
