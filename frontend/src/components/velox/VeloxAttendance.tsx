import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Download, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Search, 
  CheckCheck,
  CheckCircle2
} from 'lucide-react';
import type { StudentRecord, AttendanceStatus, AttendanceRecord } from './types';
import { RELIGION_AREA_NAME } from './religionCompetencies';

interface VeloxAttendanceProps {
  students: StudentRecord[];
  selectedGrade: number;
  selectedSection: string;
}

export const VeloxAttendance: React.FC<VeloxAttendanceProps> = ({
  students,
  selectedGrade,
  selectedSection,
}) => {
  // Today's date YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Storage key based on date, grade, section
  const storageKey = `velox_attend_${selectedDate}_${selectedGrade}_${selectedSection}`;

  // State: studentId -> AttendanceRecord
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  // Reload when date or classroom changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setAttendanceMap(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }
    setAttendanceMap({});
  }, [storageKey]);

  // Navigate date by offset in days
  const changeDateBy = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = s.grade === selectedGrade && s.section === selectedSection;
      if (!matchClass) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.dni.includes(q);
    });
  }, [students, selectedGrade, selectedSection, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    let presente = 0;
    let falta = 0;
    let tardanza = 0;
    let justificado = 0;
    let markedCount = 0;

    filteredStudents.forEach(st => {
      const rec = attendanceMap[st.id];
      if (rec && rec.status) {
        markedCount++;
        if (rec.status === 'P') presente++;
        else if (rec.status === 'F') falta++;
        else if (rec.status === 'T') tardanza++;
        else if (rec.status === 'J') justificado++;
      }
    });

    const calcPercent = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

    return {
      total,
      markedCount,
      presente,
      presentePct: calcPercent(presente),
      falta,
      faltaPct: calcPercent(falta),
      tardanza,
      tardanzaPct: calcPercent(tardanza),
      justificado,
      justificadoPct: calcPercent(justificado)
    };
  }, [filteredStudents, attendanceMap]);

  // Toggle or update status
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { studentId, date: selectedDate, grade: selectedGrade, section: selectedSection, status: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: current.status === status ? '' : status
        }
      };
    });
  };

  // Update observation
  const setStudentObs = (studentId: string, obs: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { studentId, date: selectedDate, grade: selectedGrade, section: selectedSection, status: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          observation: obs
        }
      };
    });
  };

  // Mark all unmarked students as Present
  const markAllPresent = () => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      filteredStudents.forEach(st => {
        if (!next[st.id] || !next[st.id].status) {
          next[st.id] = {
            studentId: st.id,
            date: selectedDate,
            grade: selectedGrade,
            section: selectedSection,
            status: 'P'
          };
        }
      });
      return next;
    });
  };

  // Save attendance
  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(attendanceMap));
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (e) {
      alert('Error guardando asistencia: ' + e);
    }
  };

  // Export attendance to Excel-compatible table (.xls)
  const exportAttendanceExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
          .hdr { background-color: #004D40; color: white; font-weight: bold; }
          .p { background-color: #DCFCE7; color: #15803D; font-weight: bold; }
          .f { background-color: #FEE2E2; color: #B91C1C; font-weight: bold; }
          .t { background-color: #FEF3C7; color: #B45309; font-weight: bold; }
          .j { background-color: #E0F2FE; color: #0369A1; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>CONTROL DE ASISTENCIA DIARIA - ÁREA DE EDUCACIÓN RELIGIOSA</h2>
        <p><strong>Fecha:</strong> ${selectedDate} | <strong>Grado:</strong> ${selectedGrade}° Sec "${selectedSection}"</p>
        <p><strong>Resumen:</strong> Presentes: ${stats.presente} (${stats.presentePct}%) | Faltas: ${stats.falta} (${stats.faltaPct}%) | Tardanzas: ${stats.tardanza} | Justificados: ${stats.justificado}</p>
        <table>
          <thead>
            <tr class="hdr">
              <th>N°</th>
              <th>DNI</th>
              <th>Apellidos y Nombres</th>
              <th>Estado</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredStudents.forEach((st, idx) => {
      const rec = attendanceMap[st.id];
      const stCode = rec?.status || '-';
      const label = stCode === 'P' ? 'PRESENTE' : stCode === 'F' ? 'FALTA' : stCode === 'T' ? 'TARDANZA' : stCode === 'J' ? 'JUSTIFICADO' : 'SIN MARCAR';
      const cssClass = stCode.toLowerCase();

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${st.dni}</td>
          <td style="text-align: left;">${st.fullName}</td>
          <td class="${cssClass}">${label}</td>
          <td>${rec?.observation || ''}</td>
        </tr>
      `;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Asistencia_Religiosa_${selectedDate}_${selectedGrade}${selectedSection}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Panel &gt; Asistencia</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Control de Asistencia</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Registra y gestiona la asistencia diaria para asegurar el seguimiento puntual de tus alumnos en <strong className="text-blue-700">{RELIGION_AREA_NAME}</strong>.
          </p>
        </div>

        {/* Date Navigator (Exact mirror of Velox reference) */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button 
            type="button"
            onClick={() => changeDateBy(-1)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1 font-bold text-xs text-slate-800">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input 
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button 
            type="button"
            onClick={() => changeDateBy(1)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Status Summary Cards (Exact mirror of Velox reference - Image 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black tracking-wider uppercase text-slate-500">TOTAL</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              👥
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
          </div>
        </div>

        {/* Presente */}
        <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-[11px] font-black tracking-wider uppercase text-emerald-800">PRESENTE</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-800">{stats.presente}</span>
            <span className="text-xs font-black text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">{stats.presentePct}%</span>
          </div>
        </div>

        {/* Falta */}
        <div className="bg-[#fef2f2] p-5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-600">
            <span className="text-[11px] font-black tracking-wider uppercase text-rose-800">FALTA</span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
              <X className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-800">{stats.falta}</span>
            <span className="text-xs font-black text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-md">{stats.faltaPct}%</span>
          </div>
        </div>

        {/* Tardanza */}
        <div className="bg-[#fffbeb] p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-amber-600">
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-800">TARDANZA</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-800">{stats.tardanza}</span>
            <span className="text-xs font-black text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">{stats.tardanzaPct}%</span>
          </div>
        </div>

        {/* Justificado */}
        <div className="bg-[#f0f9ff] p-5 rounded-2xl border border-sky-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-sky-600">
            <span className="text-[11px] font-black tracking-wider uppercase text-sky-800">JUSTIFICADO</span>
            <div className="w-7 h-7 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-sky-800">{stats.justificado}</span>
            <span className="text-xs font-black text-sky-600 bg-sky-100/80 px-2 py-0.5 rounded-md">{stats.justificadoPct}%</span>
          </div>
        </div>
      </div>

      {/* Progress & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">Progreso de Registro:</span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {stats.markedCount} de {stats.total} marcados
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccessMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Asistencia guardada
            </span>
          )}

          <button 
            type="button"
            onClick={markAllPresent}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" /> Marcar Todos Presentes
          </button>

          <button 
            type="button"
            onClick={exportAttendanceExcel}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Exportar (Excel)
          </button>

          <button 
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Guardar Asistencia
          </button>
        </div>
      </div>

      {/* Search & Class Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="md:col-span-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Buscador</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control text-xs pl-8 py-2 rounded-xl border border-slate-300 w-full focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sección, Grado</label>
          <div className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700">
            {selectedGrade}° de Secundaria - "{selectedSection}"
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Área Curricular</label>
          <div className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900">
            ✝ {RELIGION_AREA_NAME}
          </div>
        </div>
      </div>

      {/* Attendance Interactive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-300">
                <th className="p-3 w-12 text-center">N°</th>
                <th className="p-3 w-28">DNI</th>
                <th className="p-3">Apellidos y Nombres</th>
                <th className="p-3 text-center min-w-[200px]">Marcar Asistencia</th>
                <th className="p-3 min-w-[220px]">Observación / Justificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    No hay estudiantes registrados para este grado y sección.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const rec = attendanceMap[st.id] || { studentId: st.id, date: selectedDate, grade: selectedGrade, section: selectedSection, status: '' };
                  const currentStatus = rec.status;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-600">
                        {st.dni}
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 uppercase block">
                          {st.fullName}
                        </span>
                        {st.parentPhone && (
                          <span className="text-[10px] text-slate-400">Apoderado: {st.parentPhone}</span>
                        )}
                      </td>
                      {/* One-click attendance buttons P, F, T, J */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                          {/* Presente */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.id, 'P')}
                            className={`w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                              currentStatus === 'P'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400 scale-105'
                                : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title="Presente"
                          >
                            P
                          </button>

                          {/* Falta */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.id, 'F')}
                            className={`w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                              currentStatus === 'F'
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400 scale-105'
                                : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                            title="Falta injustificada"
                          >
                            F
                          </button>

                          {/* Tardanza */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.id, 'T')}
                            className={`w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                              currentStatus === 'T'
                                ? 'bg-amber-500 text-slate-900 shadow-sm ring-2 ring-amber-300 scale-105'
                                : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                            title="Tardanza"
                          >
                            T
                          </button>

                          {/* Justificado */}
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.id, 'J')}
                            className={`w-9 h-8 rounded-lg font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                              currentStatus === 'J'
                                ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-400 scale-105'
                                : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                            }`}
                            title="Falta justificada"
                          >
                            J
                          </button>
                        </div>
                      </td>

                      {/* Observation */}
                      <td className="p-3">
                        <input 
                          type="text"
                          placeholder="Nota u observación..."
                          value={rec.observation || ''}
                          onChange={e => setStudentObs(st.id, e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                      </td>
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
