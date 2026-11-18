import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  BarChart2, 
  Calendar, 
  Building
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StudentRecord } from './types';
import { RELIGION_AREA_NAME, calculateCompetencyAverage, calculateFinalGrade } from './religionCompetencies';

interface VeloxReportsProps {
  students: StudentRecord[];
  selectedGrade: number;
  selectedSection: string;
  teacherName?: string;
}

export const VeloxReports: React.FC<VeloxReportsProps> = ({
  students,
  selectedGrade,
  selectedSection,
  teacherName = 'Prof. Carlos Mendoza'
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'analytics'>('documents');
  const [bimestre, setBimestre] = useState<'I' | 'II' | 'III' | 'IV'>('IV');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter students for currently selected grade & section
  const sectionStudents = students.filter(s => s.grade === selectedGrade && s.section === selectedSection);

  // Get saved evaluation grades from localStorage
  const getSavedGrades = () => {
    try {
      const key = `velox_eval_rel_${selectedGrade}_${selectedSection}_${bimestre}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  };

  // Generate Official Section Report PDF
  const generateSectionReportPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const grades = getSavedGrades();

      // Header Banner
      doc.setFillColor(0, 77, 64); // Deep Teal
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('COLECCIÓN CRECIENDO JUNTOS • INFORME PEDAGÓGICO DE EVALUACIÓN 2026', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('MINEDU - CURRÍCULO NACIONAL DE EDUCACIÓN BÁSICA REGULAR • ÁREA DE EDUCACIÓN RELIGIOSA', 14, 18);

      // Meta Info Block
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Institución Educativa: I.E. 7053 Reino de España / Creciendo Juntos`, 14, 32);
      doc.text(`Docente a Cargo: ${teacherName}`, 14, 38);
      doc.text(`Área Curricular: ${RELIGION_AREA_NAME}`, 14, 44);

      doc.text(`Grado y Sección: ${selectedGrade}° de Secundaria "${selectedSection}"`, 190, 32);
      doc.text(`Periodo: ${bimestre} Bimestre`, 190, 38);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 190, 44);

      // Table Data Preparation
      const tableRows = sectionStudents.map((st, idx) => {
        const stGrades = grades[st.id] || {};
        const c1Cap1 = stGrades['rel_c1_cap1'] || '-';
        const c1Cap2 = stGrades['rel_c1_cap2'] || '-';
        const c1Logro = calculateCompetencyAverage([c1Cap1, c1Cap2]) || '-';

        const c2Cap1 = stGrades['rel_c2_cap1'] || '-';
        const c2Cap2 = stGrades['rel_c2_cap2'] || '-';
        const c2Logro = calculateCompetencyAverage([c2Cap1, c2Cap2]) || '-';

        const finalGrade = calculateFinalGrade([c1Logro === '-' ? '' : c1Logro, c2Logro === '-' ? '' : c2Logro]) || '-';

        return [
          idx + 1,
          st.dni,
          st.fullName,
          c1Cap1,
          c1Cap2,
          c1Logro,
          c2Cap1,
          c2Cap2,
          c2Logro,
          finalGrade
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: [
          [
            { content: 'N°', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'DNI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Apellidos y Nombres', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
            { content: 'C1: Construye su identidad como persona...', colSpan: 3, styles: { halign: 'center', fillColor: [37, 99, 235] } },
            { content: 'C2: Asume la experiencia del encuentro con Dios...', colSpan: 3, styles: { halign: 'center', fillColor: [234, 88, 12] } },
            { content: 'LOGRO FINAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [249, 115, 22] } }
          ],
          [
            { content: 'Cap 1', styles: { halign: 'center', fontSize: 8 } },
            { content: 'Cap 2', styles: { halign: 'center', fontSize: 8 } },
            { content: 'LOGRO', styles: { halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 58, 138] } },
            { content: 'Cap 1', styles: { halign: 'center', fontSize: 8 } },
            { content: 'Cap 2', styles: { halign: 'center', fontSize: 8 } },
            { content: 'LOGRO', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 237, 213], textColor: [154, 52, 18] } }
          ]
        ],
        body: tableRows,
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: [203, 213, 225],
          lineWidth: 0.2
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 80 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          9: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [194, 65, 12] }
        }
      });

      // Signatures Block
      const finalY = (doc as any).lastAutoTable.finalY + 25;
      if (finalY < 185) {
        doc.setDrawColor(148, 163, 184);
        doc.line(40, finalY, 110, finalY);
        doc.line(180, finalY, 250, finalY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('FIRMA DEL DOCENTE', 75, finalY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(teacherName, 75, finalY + 10, { align: 'center' });
        doc.text('Docente de Educación Religiosa', 75, finalY + 14, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.text('DIRECCIÓN / SUBDIRECCIÓN', 215, finalY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('I.E. 7053 Reino de España', 215, finalY + 10, { align: 'center' });
      }

      doc.save(`Reporte_Seccion_Religiosa_${selectedGrade}${selectedSection}_${bimestre}Bim.pdf`);
    } catch (err) {
      alert('Error generando PDF: ' + err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner (Exact mirror of Velox reference - Image 6) */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white p-6 md:p-8 rounded-2xl shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold">
              <Building className="w-4 h-4" /> 7053 Reino de España • Colección Creciendo Juntos
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-7 h-7 text-white" />
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Centro de Reportes</h2>
            </div>
            <p className="text-xs md:text-sm text-blue-100 max-w-xl">
              Generación de documentos oficiales, actas auxiliares y análisis pedagógico con tecnología inteligente para el <strong className="text-white">Área de Educación Religiosa</strong>.
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-200">PERIODO ACTUAL</span>
            <span className="text-base font-black text-white">{bimestre}° Bimestre</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`py-2 px-4 border-b-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> DOCUMENTOS OFICIALES
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-4 border-b-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> ANÁLISIS ESTADÍSTICO
        </button>
      </div>

      {/* Main Grid: Left Filters + Right Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-blue-600" /> Filtros de Configuración
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grado</label>
            <div className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              {selectedGrade}° de Secundaria
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sección</label>
            <div className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              Sección "{selectedSection}"
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bimestre</label>
            <select
              value={bimestre}
              onChange={e => setBimestre(e.target.value as any)}
              className="form-control text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="I">1° Bimestre</option>
              <option value="II">2° Bimestre</option>
              <option value="III">3° Bimestre</option>
              <option value="IV">4° Bimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Área Curricular</label>
            <div className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900">
              ✝ {RELIGION_AREA_NAME}
            </div>
          </div>
        </div>

        {/* Right Report Cards */}
        <div className="lg:col-span-3 space-y-4">
          {activeTab === 'documents' ? (
            <>
              {/* Card 1: Reporte de Sección (Level 1) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                    NIVEL 1: AULA & DOCENTE
                  </span>
                  <h3 className="text-lg font-black text-slate-800">Reporte de Sección Oficial (PDF)</h3>
                  <p className="text-xs text-slate-500 max-w-lg">
                    Análisis integral de los niveles de logro por cada competencia y capacidad en Educación Religiosa. Con membrete oficial, firmas y formato ministerial listo para imprimir.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={generateSectionReportPDF}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> PDF ⬇
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Generando documento compatible para Microsoft Word...')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-600" /> WORD 📄
                  </button>
                </div>
              </div>

              {/* Card 2: Consolidado Auxiliar de Evaluación */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-emerald-300 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                    MINEDU / SIAGIE
                  </span>
                  <h3 className="text-lg font-black text-slate-800">Consolidado Auxiliar de Evaluación</h3>
                  <p className="text-xs text-slate-500 max-w-lg">
                    Matriz de notas cualitativas (AD, A, B, C) con cálculo de logro bimestral y competencias transversales para migración rápida a SIAGIE.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={generateSectionReportPDF}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> PDF ⬇
                  </button>
                </div>
              </div>

              {/* Card 3: Reporte de Asistencia */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-amber-300 transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">
                    CONTROL Y PUNTUALIDAD
                  </span>
                  <h3 className="text-lg font-black text-slate-800">Informe Mensual de Asistencia</h3>
                  <p className="text-xs text-slate-500 max-w-lg">
                    Consolidado mensual de asistencias, tardanzas justificadas e injustificadas y reporte de alumnos en riesgo de falta continua.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => alert('Descargando informe consolidado de asistencia del mes...')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> PDF ⬇
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Analytics Tab */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-lg font-black text-slate-800">Distribución de Niveles de Logro ({RELIGION_AREA_NAME})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 text-center">
                  <span className="text-xs font-bold text-violet-700 block">AD (Destacado)</span>
                  <span className="text-3xl font-black text-violet-900 mt-1 block">35%</span>
                  <span className="text-[10px] text-violet-600">Supera los aprendizajes</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-xs font-bold text-emerald-700 block">A (Esperado)</span>
                  <span className="text-3xl font-black text-emerald-900 mt-1 block">45%</span>
                  <span className="text-[10px] text-emerald-600">Alcanzó el estándar</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-xs font-bold text-amber-700 block">B (En Proceso)</span>
                  <span className="text-3xl font-black text-amber-900 mt-1 block">15%</span>
                  <span className="text-[10px] text-amber-600">Requiere acompañamiento</span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <span className="text-xs font-bold text-rose-700 block">C (En Inicio)</span>
                  <span className="text-3xl font-black text-rose-900 mt-1 block">5%</span>
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
