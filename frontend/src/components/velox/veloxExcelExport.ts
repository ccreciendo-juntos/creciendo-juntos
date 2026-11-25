import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { StudentRecord, GradeValue } from './types';
import {
  RELIGION_AREA_NAME,
  RELIGION_COMPETENCIES,
  TRANSVERSAL_COMPETENCIES,
  calculateCompetencyAverage,
  calculateFinalGrade,
} from './religionCompetencies';

export interface ExcelSectionPayload {
  grade: number;
  section: string;
  bimestre: 'I' | 'II' | 'III' | 'IV';
  students: StudentRecord[];
  grades: Record<string, Record<string, GradeValue>>;
  institutionName?: string;
  teacherName?: string;
  academicYear?: string;
}

/** Converts 1-based column index to Excel column letter (1 -> A, 27 -> AA) */
function colLetter(colIdx: number): string {
  let letter = '';
  let n = colIdx;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** Builds an Excel formula that averages literal grades (AD=4, A=3, B=2, C=1) across given cell refs */
function buildLiteralAverageFormula(cellRefs: string[]): string {
  const sumExpr = cellRefs
    .map((ref) => `IF(${ref}="AD",4,IF(${ref}="A",3,IF(${ref}="B",2,IF(${ref}="C",1,0))))`)
    .join('+');
  const countExpr = cellRefs
    .map((ref) => `IF(OR(${ref}="AD",${ref}="A",${ref}="B",${ref}="C"),1,0)`)
    .join('+');
  return `IF((${countExpr})=0,"",IF((${sumExpr})/(${countExpr})>=3.5,"AD",IF((${sumExpr})/(${countExpr})>=2.5,"A",IF((${sumExpr})/(${countExpr})>=1.5,"B","C"))))`;
}

async function addSectionWorksheet(workbook: ExcelJS.Workbook, payload: ExcelSectionPayload, idx: number) {
  const {
    grade,
    section,
    bimestre,
    students,
    grades,
    institutionName = '7053 Reino de España',
    teacherName = 'Prof. Carlos Mendoza',
    academicYear = '2026',
  } = payload;

  let rawSheetName = `REL ${grade}ro ${section}`.replace(/"/g, '').trim();
  if (grade === 1) rawSheetName = `REL 1ro ${section}`;
  else if (grade === 2) rawSheetName = `REL 2do ${section}`;
  else if (grade === 3) rawSheetName = `REL 3ro ${section}`;
  else if (grade === 4) rawSheetName = `REL 4to ${section}`;
  else if (grade === 5) rawSheetName = `REL 5to ${section}`;

  let finalSheetName = rawSheetName.substring(0, 31).replace(/[\\/*?:[\]]/g, '') || `Seccion ${idx + 1}`;
  let counter = 1;
  const baseName = finalSheetName;
  while (workbook.getWorksheet(finalSheetName)) {
    finalSheetName = `${baseName.substring(0, 27)} (${counter++})`;
  }

  const worksheet = workbook.addWorksheet(finalSheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      showGridLines: false,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.3,
        bottom: 0.3,
        header: 0.15,
        footer: 0.15,
      },
    },
    views: [{ showGridLines: false }],
  });

  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  const borderDottedV: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'dotted' },
    right: { style: 'dotted' },
  };
  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const alignRotated: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', textRotation: 90, wrapText: true };

  // Calculate total columns: N° (1) + Name (1) + Area Comps (2*(2+1)=6) + Logro Bimestral (1) + Transversal (5+4=9) = 18
  let totalCols = 2;
  RELIGION_COMPETENCIES.forEach((c) => (totalCols += c.capacities.length + 1));
  totalCols += 1; // Logro Bimestral
  TRANSVERSAL_COMPETENCIES.forEach((c) => (totalCols += c.capacities.length + 1));

  // Row 1: Title
  worksheet.getRow(1).height = 28;
  worksheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${institutionName} - REGISTRO AUXILIAR ${academicYear}`;
  titleCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF0F172A' } };
  titleCell.alignment = alignCenter;
  titleCell.protection = { locked: true };

  // Row 2 & 3: Info Header
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 18;

  const setInfo = (row: number, startCol: number, label: string, val: string, labelCols = 1, valCols = 3) => {
    const cL = worksheet.getCell(row, startCol);
    cL.value = label;
    cL.font = { bold: true, size: 9, name: 'Arial' };
    cL.alignment = { vertical: 'middle', horizontal: 'right' };
    cL.protection = { locked: true };

    const vStart = startCol + labelCols;
    const vEnd = Math.min(vStart + valCols - 1, totalCols);
    if (vEnd > vStart) worksheet.mergeCells(row, vStart, row, vEnd);
    const cV = worksheet.getCell(row, vStart);
    cV.value = val;
    cV.font = { size: 9, name: 'Arial' };
    cV.alignment = { vertical: 'middle', horizontal: 'left' };
    cV.protection = { locked: true };
  };

  const bimestreNum = bimestre === 'I' ? '1°' : bimestre === 'II' ? '2°' : bimestre === 'III' ? '3°' : '4°';
  const gradeLabel = grade === 1 ? '1ro' : grade === 2 ? '2do' : grade === 3 ? '3ro' : grade === 4 ? '4to' : '5to';

  setInfo(2, 1, 'NIVEL:', 'Secundaria', 1, 4);
  setInfo(2, 10, 'ÁREA:', RELIGION_AREA_NAME, 1, 8);
  setInfo(3, 1, 'GRADO:', `${gradeLabel} ${section}`, 1, 4);
  setInfo(3, 6, 'BIMESTRE:', `${bimestreNum} Bimestre`, 2, 3);
  setInfo(3, 12, 'DOCENTE:', teacherName, 2, 5);

  // Row 4, 5, 6: Table Headers
  const rGroup = 4;
  const rComp = 5;
  const rCap = 6;
  worksheet.getRow(rGroup).height = 22;
  worksheet.getRow(rComp).height = 55;
  worksheet.getRow(rCap).height = 95;

  worksheet.mergeCells(`A${rGroup}:A${rCap}`);
  const cellNo = worksheet.getCell(`A${rGroup}`);
  cellNo.value = 'N°';
  cellNo.alignment = alignCenter;
  cellNo.border = borderThin;
  cellNo.font = { bold: true, size: 9, name: 'Arial' };
  cellNo.protection = { locked: true };
  worksheet.getColumn(1).width = 4.5;

  worksheet.mergeCells(`B${rGroup}:B${rCap}`);
  const cellName = worksheet.getCell(`B${rGroup}`);
  cellName.value = 'APELLIDOS Y NOMBRES';
  cellName.alignment = alignCenter;
  cellName.border = borderThin;
  cellName.font = { bold: true, size: 9, name: 'Arial' };
  cellName.protection = { locked: true };
  worksheet.getColumn(2).width = 36;

  let colIdx = 3;
  const AREA_COLORS = ['FFFF99', 'FFCC99'];
  const TRANS_COLORS = ['E6E6E6', 'E6E6E6'];
  const compLogroCols: { compId: string; compName: string; logroCol: number; colorHex: string }[] = [];

  const renderCompGroup = (comps: typeof RELIGION_COMPETENCIES, groupTitle: string, isArea: boolean) => {
    const startGroupCol = colIdx;
    comps.forEach((comp, idx) => {
      const hex = isArea ? AREA_COLORS[idx % AREA_COLORS.length] : TRANS_COLORS[idx % TRANS_COLORS.length];
      const fill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
      const endCol = colIdx + comp.capacities.length;

      worksheet.mergeCells(rComp, colIdx, rComp, endCol);
      const compCell = worksheet.getCell(rComp, colIdx);
      compCell.value = comp.name.toUpperCase();
      compCell.alignment = alignCenter;
      compCell.font = { bold: true, size: 7.5, name: 'Arial' };
      compCell.border = borderThin;
      compCell.fill = fill;
      compCell.protection = { locked: true };

      comp.capacities.forEach((cap) => {
        const cCell = worksheet.getCell(rCap, colIdx);
        cCell.value = cap.name;
        cCell.alignment = alignRotated;
        cCell.border = borderDottedV;
        cCell.font = { size: 7.5, name: 'Arial' };
        cCell.protection = { locked: true };
        worksheet.getColumn(colIdx).width = 5.5;
        colIdx++;
      });

      const lCell = worksheet.getCell(rCap, colIdx);
      lCell.value = 'LOGRO';
      lCell.alignment = alignRotated;
      lCell.font = { bold: true, size: 8, name: 'Arial' };
      lCell.border = borderThin;
      lCell.fill = fill;
      lCell.protection = { locked: true };
      worksheet.getColumn(colIdx).width = 6;

      compLogroCols.push({
        compId: comp.id,
        compName: comp.name,
        logroCol: colIdx,
        colorHex: isArea ? hex : idx === 0 ? 'CCFFCC' : 'FFFFCC',
      });
      colIdx++;
    });

    worksheet.mergeCells(rGroup, startGroupCol, rGroup, colIdx - 1);
    const gCell = worksheet.getCell(rGroup, startGroupCol);
    gCell.value = groupTitle;
    gCell.alignment = alignCenter;
    gCell.font = { bold: true, size: 9, name: 'Arial' };
    gCell.border = borderThin;
    gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isArea ? 'FFFFFF00' : 'FFD9D9D9' } };
    gCell.protection = { locked: true };
  };

  renderCompGroup(RELIGION_COMPETENCIES, 'COMPETENCIAS DE ÁREA', true);

  // Logro Bimestral Column
  const logroBimCol = colIdx;
  worksheet.mergeCells(rGroup, logroBimCol, rCap, logroBimCol);
  const lbHead = worksheet.getCell(rGroup, logroBimCol);
  lbHead.value = 'LOGRO BIMESTRAL';
  lbHead.alignment = alignRotated;
  lbHead.font = { bold: true, size: 8.5, name: 'Arial' };
  lbHead.border = borderThin;
  lbHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  lbHead.protection = { locked: true };
  worksheet.getColumn(logroBimCol).width = 6.5;
  colIdx++;

  renderCompGroup(TRANSVERSAL_COMPETENCIES, 'COMPETENCIAS TRANSVERSALES', false);

  // Student Rows
  const firstStudentRow = rCap + 1; // Row 7
  let currentRow = firstStudentRow;

  students.forEach((student, sIdx) => {
    const row = worksheet.getRow(currentRow);
    row.height = 17;
    const stGrades = grades[student.id] || {};

    const cNo = row.getCell(1);
    cNo.value = sIdx + 1;
    cNo.alignment = alignCenter;
    cNo.border = borderThin;
    cNo.font = { size: 8.5, name: 'Arial' };
    cNo.protection = { locked: true };

    const cName = row.getCell(2);
    cName.value = student.fullName.toUpperCase();
    cName.alignment = { vertical: 'middle', horizontal: 'left', indent: 0.5 };
    cName.border = borderThin;
    cName.font = { size: 8.5, name: 'Arial' };
    cName.protection = { locked: true };

    let cPos = 3;
    const areaLogroRefs: string[] = [];

    const writeStudentComps = (comps: typeof RELIGION_COMPETENCIES, isArea: boolean) => {
      comps.forEach((comp, idx) => {
        const hex = isArea ? AREA_COLORS[idx % AREA_COLORS.length] : TRANS_COLORS[idx % TRANS_COLORS.length];
        const capRefs: string[] = [];
        const capVals: GradeValue[] = [];

        comp.capacities.forEach((cap) => {
          const val = stGrades[cap.id] || '';
          capVals.push(val);
          const cell = row.getCell(cPos);
          cell.value = val;
          cell.alignment = alignCenter;
          cell.border = borderDottedV;
          cell.font = { size: 8.5, bold: true, name: 'Arial' };
          // Capacity input cells are unlocked so the teacher can enter/edit grades
          cell.protection = { locked: false };
          capRefs.push(`${colLetter(cPos)}${currentRow}`);
          cPos++;
        });

        const avgVal = calculateCompetencyAverage(capVals);
        const logroCell = row.getCell(cPos);
        const formula = buildLiteralAverageFormula(capRefs);
        logroCell.value = { formula, result: avgVal || undefined };
        logroCell.alignment = alignCenter;
        logroCell.font = { bold: true, size: 8.5, name: 'Arial' };
        logroCell.border = borderThin;
        logroCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
        logroCell.protection = { locked: true };

        if (isArea) {
          areaLogroRefs.push(`${colLetter(cPos)}${currentRow}`);
        }
        cPos++;
      });
    };

    writeStudentComps(RELIGION_COMPETENCIES, true);

    // Logro Bimestral with Formula
    const areaAvgs = RELIGION_COMPETENCIES.map((comp) =>
      calculateCompetencyAverage(comp.capacities.map((cap) => stGrades[cap.id] || ''))
    );
    const finalGradeVal = calculateFinalGrade(areaAvgs);
    const lbCell = row.getCell(cPos);
    lbCell.value = {
      formula: buildLiteralAverageFormula(areaLogroRefs),
      result: finalGradeVal || undefined,
    };
    lbCell.alignment = alignCenter;
    lbCell.font = { bold: true, size: 9, name: 'Arial' };
    lbCell.border = borderThin;
    lbCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    lbCell.protection = { locked: true };
    cPos++;

    writeStudentComps(TRANSVERSAL_COMPETENCIES, false);

    currentRow++;
  });

  const lastStudentRow = currentRow - 1;

  // --- Cuadro Estadístico por Competencia (with COUNTIF & % formulas) ---
  if (students.length > 0) {
    currentRow += 1;
    const statsStartCol = 3;
    const statsEndCol = statsStartCol + compLogroCols.length * 4 - 1;

    // Title
    worksheet.getRow(currentRow).height = 20;
    worksheet.mergeCells(currentRow, statsStartCol, currentRow, statsEndCol);
    const stTitle = worksheet.getCell(currentRow, statsStartCol);
    stTitle.value = 'ESTADÍSTICA DE LOGRO POR COMPETENCIA';
    stTitle.font = { bold: true, size: 10, name: 'Arial' };
    stTitle.alignment = alignCenter;
    stTitle.border = borderThin;
    stTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    stTitle.protection = { locked: true };
    currentRow++;

    // Competency Names Row
    worksheet.getRow(currentRow).height = 36;
    let colOff = statsStartCol;
    compLogroCols.forEach((cInfo) => {
      worksheet.mergeCells(currentRow, colOff, currentRow, colOff + 3);
      const cell = worksheet.getCell(currentRow, colOff);
      cell.value = cInfo.compName;
      cell.font = { bold: true, size: 7.5, name: 'Arial' };
      cell.alignment = alignCenter;
      cell.border = borderThin;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + cInfo.colorHex } };
      cell.protection = { locked: true };
      colOff += 4;
    });
    currentRow++;

    // Scale Headers (C, B, A, AD)
    const scales: ('C' | 'B' | 'A' | 'AD')[] = ['C', 'B', 'A', 'AD'];
    const scaleBg: Record<string, string> = {
      C: 'FFFF0000',
      B: 'FFFFFF00',
      A: 'FF0070C0',
      AD: 'FF00B050',
    };
    const scaleFg: Record<string, string> = {
      C: 'FFFFFFFF',
      B: 'FF000000',
      A: 'FFFFFFFF',
      AD: 'FFFFFFFF',
    };

    worksheet.getRow(currentRow).height = 18;
    colOff = statsStartCol;
    compLogroCols.forEach(() => {
      scales.forEach((sc) => {
        const cell = worksheet.getCell(currentRow, colOff);
        cell.value = sc;
        cell.font = { bold: true, size: 8.5, name: 'Arial', color: { argb: scaleFg[sc] } };
        cell.alignment = alignCenter;
        cell.border = borderThin;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: scaleBg[sc] } };
        cell.protection = { locked: true };
        colOff++;
      });
    });
    currentRow++;

    const pctRowIdx = currentRow;
    const countRowIdx = currentRow + 1;
    const totalRowIdx = currentRow + 2;

    worksheet.getRow(pctRowIdx).height = 17;
    worksheet.getRow(countRowIdx).height = 17;
    worksheet.getRow(totalRowIdx).height = 17;

    // Precompute cached stats for formula results
    const allComps = [...RELIGION_COMPETENCIES, ...TRANSVERSAL_COMPETENCIES];

    colOff = statsStartCol;
    compLogroCols.forEach((cInfo, cIdx) => {
      const compObj = allComps[cIdx];
      const logroColL = colLetter(cInfo.logroCol);
      const totalCellRef = `${colLetter(colOff)}${totalRowIdx}`;

      // Counts per scale
      const counts: Record<'C' | 'B' | 'A' | 'AD', number> = { C: 0, B: 0, A: 0, AD: 0 };
      students.forEach((st) => {
        const stG = grades[st.id] || {};
        const avg = calculateCompetencyAverage(compObj.capacities.map((cap) => stG[cap.id] || ''));
        if (avg && (avg === 'C' || avg === 'B' || avg === 'A' || avg === 'AD')) {
          counts[avg]++;
        }
      });

      scales.forEach((sc) => {
        const countCellRef = `${colLetter(colOff)}${countRowIdx}`;
        const pctVal = students.length > 0 ? counts[sc] / students.length : 0;

        // Percentage cell with formula
        const pctCell = worksheet.getCell(pctRowIdx, colOff);
        pctCell.value = {
          formula: `IF(${totalCellRef}>0,${countCellRef}/${totalCellRef},0)`,
          result: pctVal,
        };
        pctCell.numFmt = '0%';
        pctCell.alignment = alignCenter;
        pctCell.font = { bold: true, size: 8, name: 'Arial' };
        pctCell.border = borderThin;
        pctCell.protection = { locked: true };

        // Count cell with COUNTIF formula
        const cntCell = worksheet.getCell(countRowIdx, colOff);
        cntCell.value = {
          formula: `COUNTIF($${logroColL}$${firstStudentRow}:$${logroColL}$${lastStudentRow},"${sc}")`,
          result: counts[sc],
        };
        cntCell.alignment = alignCenter;
        cntCell.font = { size: 8.5, name: 'Arial' };
        cntCell.border = borderThin;
        cntCell.protection = { locked: true };

        colOff++;
      });

      // Total students merged cell with COUNTA formula
      const startTotalCol = colOff - 4;
      worksheet.mergeCells(totalRowIdx, startTotalCol, totalRowIdx, colOff - 1);
      const totCell = worksheet.getCell(totalRowIdx, startTotalCol);
      totCell.value = {
        formula: `COUNTA($B$${firstStudentRow}:$B$${lastStudentRow})`,
        result: students.length,
      };
      totCell.alignment = alignCenter;
      totCell.font = { bold: true, size: 9, name: 'Arial' };
      totCell.border = borderThin;
      totCell.protection = { locked: true };
    });
  }

  // Protect worksheet: headers, formulas, and statistics are locked; only capacity grade cells are unlocked
  await worksheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    insertRows: false,
    deleteRows: false,
    sort: false,
  });
}

export async function exportCurrentSectionExcel(payload: ExcelSectionPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Colección Creciendo Juntos - Velox 2026';
  workbook.created = new Date();

  await addSectionWorksheet(workbook, payload, 0);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Registro_Educacion_Religiosa_${payload.grade}Sec_${payload.section}_${payload.bimestre}Bim.xlsx`);
}

export async function exportAllSectionsExcel(sections: ExcelSectionPayload[]) {
  if (!sections || sections.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Colección Creciendo Juntos - Velox 2026';
  workbook.created = new Date();

  for (let i = 0; i < sections.length; i++) {
    await addSectionWorksheet(workbook, sections[i], i);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const bim = sections[0]?.bimestre || 'IV';
  saveAs(blob, `Registro_Consolidado_Educacion_Religiosa_${bim}Bim_2026.xlsx`);
}
