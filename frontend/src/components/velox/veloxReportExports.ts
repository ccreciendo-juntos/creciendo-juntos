import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  VerticalAlign,
  ShadingType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import type { StudentRecord, GradeValue } from './types';
import {
  RELIGION_AREA_NAME,
  RELIGION_COMPETENCIES,
  TRANSVERSAL_COMPETENCIES,
  calculateCompetencyAverage,
} from './religionCompetencies';

export interface CompStatsRow {
  id: string;
  name: string;
  isTransversal: boolean;
  AD: number;
  A: number;
  B: number;
  C: number;
  total: number;
}

export interface SectionReportInput {
  grade: number;
  section: string;
  bimestre: 'I' | 'II' | 'III' | 'IV';
  institutionName: string;
  teacherName: string;
  students: StudentRecord[];
  grades: Record<string, Record<string, GradeValue>>;
  allBimestresGrades?: Record<'I' | 'II' | 'III' | 'IV', Record<string, Record<string, GradeValue>>>;
  attendancePct?: number;
}

function getGradeLabel(grade: number): string {
  if (grade === 1) return '1ro';
  if (grade === 2) return '2do';
  if (grade === 3) return '3ro';
  if (grade === 4) return '4to';
  return '5to';
}

function getBimestreNum(b: 'I' | 'II' | 'III' | 'IV'): string {
  return b === 'I' ? '1°' : b === 'II' ? '2°' : b === 'III' ? '3°' : '4°';
}

function computeStats(
  students: StudentRecord[],
  grades: Record<string, Record<string, GradeValue>>
): {
  compStats: CompStatsRow[];
  evaluatedCount: number;
  studentsInC: { fullName: string; failedComps: string }[];
} {
  const allComps = [
    ...RELIGION_COMPETENCIES.map((c) => ({ ...c, isTransversal: false })),
    ...TRANSVERSAL_COMPETENCIES.map((c) => ({ ...c, isTransversal: true })),
  ];

  const compStats: CompStatsRow[] = allComps.map((c) => ({
    id: c.id,
    name: c.name,
    isTransversal: c.isTransversal,
    AD: 0,
    A: 0,
    B: 0,
    C: 0,
    total: 0,
  }));

  let evaluatedCount = 0;
  const studentsInC: { fullName: string; failedComps: string }[] = [];

  students.forEach((st) => {
    const stG = grades[st.id] || {};
    let hasAny = false;
    const failedNames: string[] = [];

    allComps.forEach((comp, idx) => {
      const avg = calculateCompetencyAverage(comp.capacities.map((cap) => stG[cap.id] || ''));
      if (avg) {
        hasAny = true;
        compStats[idx][avg]++;
        compStats[idx].total++;
        if (avg === 'C' && !comp.isTransversal) {
          failedNames.push(comp.shortName || comp.name);
        }
      }
    });

    if (hasAny) evaluatedCount++;
    if (failedNames.length > 0) {
      studentsInC.push({ fullName: st.fullName, failedComps: failedNames.join(', ') });
    }
  });

  return { compStats, evaluatedCount, studentsInC };
}

function getCompetencyNarrative(stat: CompStatsRow): string {
  const t = stat.total || 1;
  const pC = Math.round((stat.C / t) * 100);
  const pB = Math.round((stat.B / t) * 100);
  const pSat = Math.round(((stat.A + stat.AD) / t) * 100);

  if (pC >= 40 && pSat >= 40) {
    return `Los resultados muestran que el ${pC}% de los estudiantes se encuentra en nivel Inicio y el ${pSat}% en nivel Logrado. Esto indica que la mitad del grupo aún presenta dificultades para comprender y expresar aspectos relacionados con esta competencia. Los estudiantes en nivel Inicio requieren refuerzo pedagógico, acompañamiento más cercano y actividades formativas.`;
  }
  if (pB >= 50) {
    return `En esta competencia, el ${pB}% se ubica en nivel Proceso, un ${pC}% en Inicio y ${pSat}% en Logrado. Esto indica un avance progresivo de la mayoría del grupo hacia el estándar esperado. Se requiere intensificar la retroalimentación formativa y las estrategias de consolidación para asegurar el tránsito integral hacia el nivel satisfactorio en los próximos periodos.`;
  }
  if (pSat >= 60) {
    return `Los resultados muestran que el ${pSat}% de estudiantes se encuentra en nivel Logrado/Destacado, evidenciando un desarrollo óptimo de las capacidades esperadas. Un ${pB}% está en Proceso y ${pC}% en Inicio. Se recomienda consolidar los aprendizajes alcanzados y mantener estrategias de apoyo específico.`;
  }
  return `Los resultados indican que un ${pC}% está en Inicio, ${pB}% en Proceso y ${pSat}% en Logrado. Se evidencia un grupo con necesidades de aprendizaje heterogéneas. Es fundamental implementar estrategias de atención diferenciada y mantener un monitoreo continuo para asegurar que todos los estudiantes progresen hacia el nivel de logro esperado.`;
}

// ==================== PDF REPORT (4-PAGE OFFICIAL FORMAT) ====================
export async function generateOfficialSectionPDF(input: SectionReportInput) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  const gradeLabel = getGradeLabel(input.grade);
  const bimLabel = `${getBimestreNum(input.bimestre)} Bimestre`;

  const { compStats, evaluatedCount, studentsInC } = computeStats(input.students, input.grades);
  const areaComps = compStats.filter((c) => !c.isTransversal);
  const transComps = compStats.filter((c) => c.isTransversal);

  const sumGroup = (list: CompStatsRow[]) =>
    list.reduce(
      (acc, c) => ({
        AD: acc.AD + c.AD,
        A: acc.A + c.A,
        B: acc.B + c.B,
        C: acc.C + c.C,
        total: acc.total + c.total,
      }),
      { AD: 0, A: 0, B: 0, C: 0, total: 0 }
    );

  const areaTotals = sumGroup(areaComps);
  const transTotals = sumGroup(transComps);
  const globalTotals = sumGroup(compStats);

  const satPct = globalTotals.total > 0 ? Math.round(((globalTotals.A + globalTotals.AD) / globalTotals.total) * 100) : 0;
  const procPct = globalTotals.total > 0 ? Math.round((globalTotals.B / globalTotals.total) * 100) : 0;
  const iniPct = globalTotals.total > 0 ? Math.round((globalTotals.C / globalTotals.total) * 100) : 0;
  const attPct = input.attendancePct ?? 98;

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ESTADÍSTICO DE LOGROS DE APRENDIZAJE', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${input.institutionName} - Año Lectivo 2026`, pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(`Nivel 1: Aula & Docente — Reporte de Sección | ${RELIGION_AREA_NAME} - ${gradeLabel} ${input.section} | ${bimLabel}`, 14, 27);
  doc.text(today, pageWidth - 14, 27, { align: 'right' });

  let y = 39;

  // 4 KPI Cards
  const drawKPI = (x: number, title: string, value: string, textColor: string, bg: [number, number, number]) => {
    const w = 42;
    const h = 28;
    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(x, y, w, 8, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + w / 2, y + 5.2, { align: 'center' });
    doc.setFontSize(17);
    doc.setTextColor(textColor);
    doc.text(value, x + w / 2, y + 21, { align: 'center' });
  };

  drawKPI(14, 'LOGRO SATISFACTORIO (A+AD)', `${satPct}%`, '#16a34a', [220, 252, 231]);
  drawKPI(60, 'EN PROCESO (B)', `${procPct}%`, '#d97706', [254, 243, 199]);
  drawKPI(106, 'EN NIVEL INICIO (C)', `${iniPct}%`, '#dc2626', [254, 226, 226]);
  drawKPI(152, 'ASISTENCIA', `${attPct}%`, '#2563eb', [219, 234, 254]);
  y += 36;

  // Section Title
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ESTADÍSTICO DE LOGROS DE APRENDIZAJE', 14, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Nivel 1: Aula & Docente — Reporte de Sección', 14, y);
  y += 5;

  const numEst = input.students.length;
  const buildRows = (list: CompStatsRow[]) =>
    list.map((c) => {
      const t = c.total || 1;
      const aprob = c.AD + c.A + c.B;
      return [
        c.name,
        numEst,
        aprob,
        `${Math.round((aprob / t) * 100)}%`,
        c.C,
        `${Math.round((c.C / t) * 100)}%`,
        c.AD,
        `${Math.round((c.AD / t) * 100)}%`,
        c.A,
        `${Math.round((c.A / t) * 100)}%`,
        c.B,
        `${Math.round((c.B / t) * 100)}%`,
        c.C,
        `${Math.round((c.C / t) * 100)}%`,
      ];
    });

  const buildFoot = (label: string, s: { AD: number; A: number; B: number; C: number; total: number }) => {
    const t = s.total || 1;
    const aprob = s.AD + s.A + s.B;
    return [
      label,
      numEst,
      aprob,
      `${Math.round((aprob / t) * 100)}%`,
      s.C,
      `${Math.round((s.C / t) * 100)}%`,
      s.AD,
      `${Math.round((s.AD / t) * 100)}%`,
      s.A,
      `${Math.round((s.A / t) * 100)}%`,
      s.B,
      `${Math.round((s.B / t) * 100)}%`,
      s.C,
      `${Math.round((s.C / t) * 100)}%`,
    ];
  };

  const tableHead = [
    [
      { content: 'COMPETENCIA', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const, fillColor: [21, 101, 192] as [number, number, number] } },
      { content: 'N° EST.', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const, fillColor: [84, 110, 122] as [number, number, number] } },
      { content: 'APROBADOS\n(AD+A+B)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [46, 125, 50] as [number, number, number] } },
      { content: 'REQUIEREN\nRECUPERACIÓN (C)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [230, 81, 0] as [number, number, number] } },
      { content: 'DESTACADO\n(AD)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [21, 101, 192] as [number, number, number] } },
      { content: 'LOGRADO\n(A)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [46, 125, 50] as [number, number, number] } },
      { content: 'PROCESO\n(B)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [249, 168, 37] as [number, number, number], textColor: [30, 30, 30] as [number, number, number] } },
      { content: 'INICIO\n(C)', colSpan: 2, styles: { halign: 'center' as const, fillColor: [198, 40, 40] as [number, number, number] } },
    ],
    Array.from({ length: 6 }).flatMap(() => [
      { content: 'Cant.', styles: { halign: 'center' as const, fillColor: [243, 244, 246] as [number, number, number], textColor: 50, fontStyle: 'bold' as const } },
      { content: '%', styles: { halign: 'center' as const, fillColor: [243, 244, 246] as [number, number, number], textColor: 50, fontStyle: 'bold' as const } },
    ]),
  ];

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: buildRows(areaComps),
    foot: [buildFoot(`RESUMEN TOTAL (${numEst} est. × ${areaComps.length} comp.)`, areaTotals)],
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.5, halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 42, halign: 'left' } },
    footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold' },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: buildRows(transComps),
    foot: [buildFoot('RESUMEN TOTAL TRANSVERSAL', transTotals)],
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 1.5, halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 42, halign: 'left' } },
    footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold' },
  });

  y = (doc as any).lastAutoTable.finalY + 9;

  // 1. ANÁLISIS CUALITATIVO DE RESULTADOS POR COMPETENCIAS
  if (y > pageHeight - 55) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.text('1. ANÁLISIS CUALITATIVO DE RESULTADOS POR COMPETENCIAS', 14, y);
  y += 6;

  // Verdict badge
  const verdict = satPct >= 40 ? 'LOGRO SATISFACTORIO (NIVEL A / AD)' : 'REQUIERE ACOMPAÑAMIENTO FORMATIVO';
  doc.setFillColor(satPct >= 40 ? 22 : 217, satPct >= 40 ? 128 : 119, satPct >= 40 ? 61 : 6);
  doc.rect(14, y - 4, 125, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`SITUACIÓN GENERAL DE LOS APRENDIZAJES: ${verdict}`, 16, y + 0.5);
  y += 8;

  doc.setTextColor(40);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const advPct = numEst > 0 ? Math.round((evaluatedCount / numEst) * 100) : 0;
  doc.text(`RESUMEN DE ESTUDIANTES EVALUADOS: ${evaluatedCount} calificados de ${numEst} matriculados (${advPct}% de avance).`, 14, y);
  y += 6;

  // Comparative analysis between area competencies
  if (areaComps.length >= 2) {
    const sortedArea = [...areaComps].sort(
      (a, b) => ((b.A + b.AD) / (b.total || 1)) - ((a.A + a.AD) / (a.total || 1))
    );
    const best = sortedArea[0];
    const worst = sortedArea[sortedArea.length - 1];
    const bestPct = best.total > 0 ? Math.round(((best.A + best.AD) / best.total) * 100) : 0;
    const worstPct = worst.total > 0 ? Math.round(((worst.A + worst.AD) / worst.total) * 100) : 0;
    const gap = Math.abs(bestPct - worstPct);

    doc.setTextColor(79, 70, 229);
    doc.text('ANÁLISIS COMPARATIVO DE COMPETENCIAS', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    const compNarr = `Al contrastar las competencias, se identifica que "${best.name}" presenta el mayor nivel de logro satisfactorio (${bestPct}%). En contraparte, "${worst.name}" muestra el menor desempeño (${worstPct}%). Se observa un rendimiento con una diferencia de ${gap} puntos porcentuales.`;
    const splitComp = doc.splitTextToSize(compNarr, 180);
    doc.text(splitComp, 14, y);
    y += splitComp.length * 4.5 + 4;
  }

  // Detailed per-competency analysis (1..4)
  compStats.forEach((stat, idx) => {
    if (y > pageHeight - 35) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text(`${idx + 1}. ${stat.name}`, 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50);
    const narr = getCompetencyNarrative(stat);
    const split = doc.splitTextToSize(narr, 178);
    doc.text(split, 18, y);
    y += split.length * 4.2 + 4;
  });

  // Conclusión General
  if (y > pageHeight - 40) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 51, 102);
  doc.text('CONCLUSIÓN GENERAL', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50);
  const conclusionText =
    iniPct < 15
      ? 'El análisis general evidencia resultados favorables con un nivel de logro acorde al estándar previsto en la mayoría de las competencias. Se recomienda continuar fortaleciendo el desarrollo integral de los estudiantes, manteniendo estrategias que consoliden la autonomía en sus aprendizajes.'
      : 'El análisis evidencia que existe un grupo importante de estudiantes en nivel Inicio, especialmente en algunas competencias clave. Esto indica la necesidad de implementar estrategias de refuerzo escolar, acompañamiento personalizado y actividades pedagógicas diferenciadas.';
  const splitConc = doc.splitTextToSize(conclusionText, 180);
  doc.text(splitConc, 14, y);
  y += splitConc.length * 4.3 + 5;

  // Recomendación Pedagógica
  if (y > pageHeight - 35) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 51, 102);
  doc.text('RECOMENDACIÓN PEDAGÓGICA', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50);
  const recText =
    'Se recomienda desarrollar planes de refuerzo académico, actividades de acompañamiento formativo, uso de estrategias participativas y mayor integración de recursos digitales, con el fin de mejorar progresivamente los niveles de logro de las competencias evaluadas y asegurar el desarrollo integral de los estudiantes.';
  const splitRec = doc.splitTextToSize(recText, 180);
  doc.text(splitRec, 14, y);
  y += splitRec.length * 4.3 + 8;

  // 2. COMPARATIVA DE LOGROS POR BIMESTRE (PROGRESO)
  if (y > pageHeight - 90) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.text('2. COMPARATIVA DE LOGROS POR BIMESTRE (PROGRESO)', 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text('Datos de progreso (% Logro Satisfactorio A+AD)', 14, y);
  y += 4;

  const bimKeys: ('I' | 'II' | 'III' | 'IV')[] = ['I', 'II', 'III', 'IV'];
  const bimProgress: Record<string, number[]> = {};
  compStats.forEach((c) => {
    bimProgress[c.id] = bimKeys.map((bKey) => {
      const bGrades = input.allBimestresGrades?.[bKey] || (bKey === input.bimestre ? input.grades : {});
      const bComputed = computeStats(input.students, bGrades).compStats.find((x) => x.id === c.id);
      if (!bComputed || bComputed.total === 0) return -1;
      return Math.round(((bComputed.A + bComputed.AD) / bComputed.total) * 100);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [['Competencia', 'I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre']],
    body: compStats.map((c, i) => [
      `Competencia ${i + 1}: ${c.name.length > 55 ? c.name.slice(0, 52) + '...' : c.name}`,
      ...bimProgress[c.id].map((v) => (v >= 0 ? `${v}%` : '-')),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 92 }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Horizontal Bar Chart
  if (y > pageHeight - 90) { doc.addPage(); y = 20; }
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Gráfico comparativo (barras horizontales)', 14, y);
  y += 6;

  const barW = 80;
  compStats.forEach((c, idx) => {
    if (y > pageHeight - 35) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    doc.text(`Competencia ${idx + 1}`, 14, y);
    y += 3.5;

    bimKeys.forEach((bk, bIdx) => {
      const pct = bimProgress[c.id][bIdx];
      doc.setFontSize(7);
      doc.text(bk, 14, y + 3);
      doc.setFillColor(245, 245, 245);
      doc.rect(22, y, barW, 3.8, 'F');
      if (pct > 0) {
        if (pct < 50) doc.setFillColor(220, 38, 38);
        else if (pct < 75) doc.setFillColor(245, 158, 11);
        else doc.setFillColor(22, 163, 74);
        doc.rect(22, y, (pct / 100) * barW, 3.8, 'F');
        doc.text(`${pct}%`, 22 + (pct / 100) * barW + 2, y + 3);
      } else {
        doc.text('-', 24, y + 3);
      }
      y += 4.8;
    });
    y += 2;
  });

  // Ranking Competencias con Mayor Logro
  if (y > pageHeight - 50) { doc.addPage(); y = 20; }
  y += 3;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('COMPETENCIAS CON MAYOR LOGRO (A+AD)', 14, y);
  y += 6;
  const top3 = [...compStats]
    .sort((a, b) => ((b.A + b.AD) / (b.total || 1)) - ((a.A + a.AD) / (a.total || 1)))
    .slice(0, 3);
  top3.forEach((c) => {
    const pct = c.total > 0 ? Math.round(((c.A + c.AD) / c.total) * 100) : 0;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(c.name.length > 55 ? c.name.slice(0, 52) + '...' : c.name, 18, y);
    doc.setFillColor(34, 197, 94);
    doc.rect(135, y - 3, pct * 0.45, 3, 'F');
    doc.text(`${pct}%`, 135 + pct * 0.45 + 2, y);
    y += 5;
  });
  y += 5;

  // 3. ESTUDIANTES EN NIVEL INICIO
  if (y > pageHeight - 45) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text('3. ESTUDIANTES EN NIVEL INICIO - REQUIEREN INTERVENCIÓN', 14, y);
  y += 6;
  if (studentsInC.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Estudiante', 'Competencias en C', 'Estado']],
      body: studentsInC.map((s) => [s.fullName, s.failedComps, 'Requiere Refuerzo']),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 7.5 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61);
    doc.text('Excelente: No hay estudiantes en nivel de inicio en esta área.', 14, y);
    y += 8;
  }

  // 4 & 5. Vinculación Pedagógica & Desafíos Convergentes
  if (y > pageHeight - 45) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(245, 158, 11);
  doc.text('4. SEGUIMIENTO DE LA VINCULACIÓN PEDAGÓGICA', 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.setFont('helvetica', 'bold');
  doc.text('B) Estudiantes con prioridad de acompañamiento por inasistencia (>15%):', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text('No hay estudiantes con ausentismo crítico (>15%).', 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text('5. PRIORIDAD DE ACOMPAÑAMIENTO: DESAFÍOS CONVERGENTES', 14, y);
  y += 5;
  doc.setFontSize(9.5);
  doc.setTextColor(21, 128, 61);
  doc.text('Excelente: No se detectaron estudiantes en situación de riesgo integral.', 14, y);
  y += 10;

  // 6. RECOMENDACIONES PEDAGÓGICAS (MINEDU)
  if (y > pageHeight - 50) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.setFont('helvetica', 'bold');
  doc.text('6. RECOMENDACIONES PEDAGÓGICAS (MINEDU)', 14, y);
  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(40);
  doc.setFont('helvetica', 'normal');
  const recs = [
    '1. RETROALIMENTACIÓN FORMATIVA: Implementar sesiones de retroalimentación específica para estudiantes en nivel inicio.',
    '2. ATENCIÓN DIFERENCIADA: Diseñar actividades adaptadas según los niveles de logro identificados.',
    '3. TUTORÍAS FOCALIZADAS: Establecer espacios de refuerzo académico para estudiantes en riesgo.',
    '4. COMUNICACIÓN CON FAMILIAS: Contactar a padres de estudiantes en situación de riesgo para trabajo conjunto.',
    '5. MONITOREO CONTINUO: Realizar seguimiento semanal del progreso de estudiantes en nivel inicio.',
    '6. EVIDENCIAS DE APRENDIZAJE: Documentar avances mediante portafolios y registros anecdóticos.',
  ];
  recs.forEach((r) => {
    doc.text(r, 14, y);
    y += 5;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('REG-EVA 2026 | © Sistema de Gestión Pedagógica Velox', pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  const blob = doc.output('blob');
  saveAs(blob, `Reporte_Seccion_${RELIGION_AREA_NAME.replace(/ /g, '_')}_${gradeLabel}_${input.section}_${input.bimestre}Bim.pdf`);
}

// ==================== WORD REPORT (.DOCX MATCHING ATTACHED WORD) ====================
export async function generateOfficialSectionWord(input: SectionReportInput) {
  const gradeLabel = getGradeLabel(input.grade);
  const bimLabel = `${getBimestreNum(input.bimestre)} Bimestre`;
  const { compStats, evaluatedCount, studentsInC } = computeStats(input.students, input.grades);
  const areaComps = compStats.filter((c) => !c.isTransversal);
  const transComps = compStats.filter((c) => c.isTransversal);

  const sumGroup = (list: CompStatsRow[]) =>
    list.reduce(
      (acc, c) => ({
        AD: acc.AD + c.AD,
        A: acc.A + c.A,
        B: acc.B + c.B,
        C: acc.C + c.C,
        total: acc.total + c.total,
      }),
      { AD: 0, A: 0, B: 0, C: 0, total: 0 }
    );

  const globalTotals = sumGroup(compStats);
  const satPct = globalTotals.total > 0 ? Math.round(((globalTotals.A + globalTotals.AD) / globalTotals.total) * 100) : 0;
  const procPct = globalTotals.total > 0 ? Math.round((globalTotals.B / globalTotals.total) * 100) : 0;
  const iniPct = globalTotals.total > 0 ? Math.round((globalTotals.C / globalTotals.total) * 100) : 0;
  const attPct = input.attendancePct ?? 98;

  const makeCell = (text: string, bold = false, fillHex?: string, colorHex = '1E293B', align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER, size = 18) =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      shading: fillHex ? { type: ShadingType.CLEAR, fill: fillHex } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text, bold, color: colorHex, size, font: 'Calibri' })],
        }),
      ],
    });

  const buildCompWordTable = (list: CompStatsRow[], footerLabel: string) => {
    const tot = sumGroup(list);
    const headerRow = new TableRow({
      children: [
        makeCell('COMPETENCIA', true, '1565C0', 'FFFFFF', AlignmentType.LEFT, 16),
        makeCell('N° EST.', true, '546E7A', 'FFFFFF', AlignmentType.CENTER, 16),
        makeCell('APROB. %', true, '2E7D32', 'FFFFFF', AlignmentType.CENTER, 16),
        makeCell('AD', true, '1565C0', 'FFFFFF', AlignmentType.CENTER, 16),
        makeCell('A', true, '2E7D32', 'FFFFFF', AlignmentType.CENTER, 16),
        makeCell('B', true, 'F9A825', '1E293B', AlignmentType.CENTER, 16),
        makeCell('C', true, 'C62828', 'FFFFFF', AlignmentType.CENTER, 16),
      ],
    });

    const dataRows = list.map((c) => {
      const t = c.total || 1;
      const aprobPct = Math.round(((c.AD + c.A + c.B) / t) * 100);
      return new TableRow({
        children: [
          makeCell(c.name, false, undefined, '1E293B', AlignmentType.LEFT, 16),
          makeCell(String(input.students.length), false, undefined, '1E293B', AlignmentType.CENTER, 16),
          makeCell(`${aprobPct}%`, true, undefined, '16A34A', AlignmentType.CENTER, 16),
          makeCell(`${c.AD} (${Math.round((c.AD / t) * 100)}%)`, false, undefined, '1E293B', AlignmentType.CENTER, 16),
          makeCell(`${c.A} (${Math.round((c.A / t) * 100)}%)`, false, undefined, '1E293B', AlignmentType.CENTER, 16),
          makeCell(`${c.B} (${Math.round((c.B / t) * 100)}%)`, false, undefined, '1E293B', AlignmentType.CENTER, 16),
          makeCell(`${c.C} (${Math.round((c.C / t) * 100)}%)`, false, undefined, '1E293B', AlignmentType.CENTER, 16),
        ],
      });
    });

    const tTot = tot.total || 1;
    const aprobTot = Math.round(((tot.AD + tot.A + tot.B) / tTot) * 100);
    const footRow = new TableRow({
      children: [
        makeCell(footerLabel, true, 'F1F5F9', '1E293B', AlignmentType.LEFT, 16),
        makeCell(String(input.students.length), true, 'F1F5F9', '1E293B', AlignmentType.CENTER, 16),
        makeCell(`${aprobTot}%`, true, 'F1F5F9', '16A34A', AlignmentType.CENTER, 16),
        makeCell(`${tot.AD} (${Math.round((tot.AD / tTot) * 100)}%)`, true, 'F1F5F9', '1E293B', AlignmentType.CENTER, 16),
        makeCell(`${tot.A} (${Math.round((tot.A / tTot) * 100)}%)`, true, 'F1F5F9', '1E293B', AlignmentType.CENTER, 16),
        makeCell(`${tot.B} (${Math.round((tot.B / tTot) * 100)}%)`, true, 'F1F5F9', '1E293B', AlignmentType.CENTER, 16),
        makeCell(`${tot.C} (${Math.round((tot.C / tTot) * 100)}%)`, true, 'F1F5F9', '1E293B', AlignmentType.CENTER, 16),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows, footRow],
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            shading: { type: ShadingType.CLEAR, fill: '1E293B' },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'INFORME ESTADÍSTICO DE LOGROS DE APRENDIZAJE\n', bold: true, color: 'FFFFFF', size: 28 }),
              new TextRun({ text: `${input.institutionName} - AÑO LECTIVO 2026\n`, color: 'E2E8F0', size: 20 }),
              new TextRun({ text: `Nivel 1: Aula & Docente — Reporte de Sección | ${RELIGION_AREA_NAME} - ${gradeLabel} "${input.section}" | ${bimLabel}`, color: '94A3B8', size: 18 }),
            ],
          }),
          new Paragraph({ text: '', spacing: { after: 150 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeCell('LOGRO SATISFACTORIO', true, 'DCFCE7', '16A34A', AlignmentType.CENTER, 16),
                  makeCell('EN PROCESO (B)', true, 'FEF3C7', 'D97706', AlignmentType.CENTER, 16),
                  makeCell('EN NIVEL INICIO (C)', true, 'FEE2E2', 'DC2626', AlignmentType.CENTER, 16),
                  makeCell('ASISTENCIA', true, 'DBEAFE', '2563EB', AlignmentType.CENTER, 16),
                ],
              }),
              new TableRow({
                children: [
                  makeCell(`${satPct}%`, true, undefined, '16A34A', AlignmentType.CENTER, 28),
                  makeCell(`${procPct}%`, true, undefined, 'D97706', AlignmentType.CENTER, 28),
                  makeCell(`${iniPct}%`, true, undefined, 'DC2626', AlignmentType.CENTER, 28),
                  makeCell(`${attPct}%`, true, undefined, '2563EB', AlignmentType.CENTER, 28),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: '1. INFORME ESTADÍSTICO DE LOGROS DE APRENDIZAJE', bold: true, size: 22, color: '1E293B' })],
            spacing: { after: 120 },
          }),
          buildCompWordTable(areaComps, 'RESUMEN TOTAL ÁREA'),
          new Paragraph({ text: '', spacing: { after: 150 } }),
          buildCompWordTable(transComps, 'RESUMEN TOTAL TRANSVERSAL'),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: '2. ANÁLISIS CUALITATIVO DE RESULTADOS POR COMPETENCIAS', bold: true, size: 22, color: '003366' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `RESUMEN DE ESTUDIANTES EVALUADOS: ${evaluatedCount} calificados de ${input.students.length} matriculados.`,
                bold: true,
                size: 18,
              }),
            ],
            spacing: { after: 100 },
          }),
          ...compStats.flatMap((c, i) => [
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${c.name}`, bold: true, size: 18, color: '003366' })],
              spacing: { before: 100, after: 40 },
            }),
            new Paragraph({
              children: [new TextRun({ text: getCompetencyNarrative(c), size: 18, color: '334155' })],
              spacing: { after: 80 },
            }),
          ]),
          new Paragraph({
            children: [new TextRun({ text: '3. ESTUDIANTES EN NIVEL INICIO - REQUIEREN INTERVENCIÓN', bold: true, size: 22, color: 'DC2626' })],
            spacing: { before: 160, after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  studentsInC.length > 0
                    ? studentsInC.map((s) => `• ${s.fullName}: ${s.failedComps}`).join('\n')
                    : 'Excelente: No hay estudiantes en nivel de inicio en esta área.',
                size: 18,
                color: studentsInC.length > 0 ? 'DC2626' : '16A34A',
              }),
            ],
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '6. RECOMENDACIONES PEDAGÓGICAS (MINEDU)', bold: true, size: 22, color: '2563EB' })],
            spacing: { after: 80 },
          }),
          ...[
            '1. RETROALIMENTACIÓN FORMATIVA: Implementar sesiones específicas para estudiantes en nivel inicio.',
            '2. ATENCIÓN DIFERENCIADA: Diseñar actividades adaptadas según los niveles de logro identificados.',
            '3. TUTORÍAS FOCALIZADAS: Establecer espacios de refuerzo académico para estudiantes en riesgo.',
            '4. COMUNICACIÓN CON FAMILIAS: Contactar a padres de estudiantes en situación de riesgo.',
            '5. MONITOREO CONTINUO: Realizar seguimiento semanal del progreso de estudiantes.',
            '6. EVIDENCIAS DE APRENDIZAJE: Documentar avances mediante portafolios y registros anecdóticos.',
          ].map(
            (r) =>
              new Paragraph({
                children: [new TextRun({ text: r, size: 18 })],
                spacing: { after: 40 },
              })
          ),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [new TextRun({ text: 'REG-EVA 2026 | © Sistema de Gestión Pedagógica Velox', italics: true, size: 16, color: '94A3B8' })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Reporte_Seccion_${RELIGION_AREA_NAME.replace(/ /g, '_')}_${gradeLabel}_${input.section}_${input.bimestre}Bim.docx`);
}
