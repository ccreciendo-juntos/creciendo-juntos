import React, { useState } from 'react';
import { 
  FileText, UploadCloud, Link as LinkIcon, CheckCircle2, Clock, 
  ArrowLeft, Send, Award, Check, RefreshCw
} from 'lucide-react';
import type { NovaActivity, NovaSubmission } from './types';
import { RELIGION_COMPETENCIES } from '../velox/religionCompetencies';

interface NovaAssignmentViewProps {
  activity: NovaActivity;
  currentUser: {
    id: string;
    name: string;
    email?: string;
    role: string;
    grade?: number;
    section?: string;
  };
  existingSubmission?: NovaSubmission;
  allSubmissions?: NovaSubmission[];
  onSaveSubmission: (submission: NovaSubmission) => void;
  onGradeSubmission?: (submissionId: string, score: number, level: 'AD' | 'A' | 'B' | 'C', feedback: string) => void;
  onClose: () => void;
}

export const NovaAssignmentView: React.FC<NovaAssignmentViewProps> = ({
  activity,
  currentUser,
  existingSubmission,
  allSubmissions = [],
  onSaveSubmission,
  onGradeSubmission,
  onClose
}) => {
  const isTeacher = currentUser.role === 'docente' || currentUser.role === 'admin' || currentUser.role === 'super_admin';
  
  // Student submission form state
  const [evidenceText, setEvidenceText] = useState(existingSubmission?.evidence_text || '');
  const [evidenceLink, setEvidenceLink] = useState(existingSubmission?.evidence_link || '');
  const [selectedFileName, setSelectedFileName] = useState(existingSubmission?.evidence_file_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Teacher grading state
  const [selectedStudentSubmission, setSelectedStudentSubmission] = useState<NovaSubmission | null>(
    allSubmissions.length > 0 ? allSubmissions[0] : null
  );
  const [gradeScore, setGradeScore] = useState<number>(selectedStudentSubmission?.score || 18);
  const [gradeLevel, setGradeLevel] = useState<'AD' | 'A' | 'B' | 'C'>(selectedStudentSubmission?.achievement_level || 'A');
  const [teacherFeedback, setTeacherFeedback] = useState<string>(selectedStudentSubmission?.teacher_feedback || '');
  const [gradingSuccess, setGradingSuccess] = useState(false);

  // Quick feedback templates for religion
  const feedbackTemplates = [
    '¡Excelente fundamentación bíblica y compromiso ético demostrado!',
    'Buen análisis de la doctrina social de la Iglesia. Sugiero profundizar en las acciones comunitarias.',
    'Buen trabajo reflexivo. Cumple con los criterios de la competencia de manera adecuada.',
    'Propuesta interesante; recuerda contrastar las situaciones cotidianas con las enseñanzas del Evangelio.'
  ];

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceText && !evidenceLink && !selectedFileName) {
      alert('Por favor ingrese un texto de reflexión, un enlace o adjunte un archivo para su entrega.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const submission: NovaSubmission = {
        id: existingSubmission?.id || `sub_${Date.now()}`,
        activity_id: activity.id,
        student_id: currentUser.id,
        student_name: currentUser.name || 'Estudiante',
        grade: currentUser.grade || activity.grade,
        section: currentUser.section || activity.section,
        submitted_at: new Date().toISOString(),
        status: 'Entregado',
        evidence_text: evidenceText,
        evidence_link: evidenceLink,
        evidence_file_name: selectedFileName || (evidenceLink ? 'Enlace_Web.url' : 'Entrega_Escrita.txt'),
        score: existingSubmission?.score,
        achievement_level: existingSubmission?.achievement_level,
        teacher_feedback: existingSubmission?.teacher_feedback
      };

      onSaveSubmission(submission);
      setIsSubmitting(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }, 600);
  };

  const handleSelectStudent = (sub: NovaSubmission) => {
    setSelectedStudentSubmission(sub);
    setGradeScore(sub.score || 16);
    setGradeLevel(sub.achievement_level || (sub.score && sub.score >= 18 ? 'AD' : sub.score && sub.score >= 14 ? 'A' : 'B'));
    setTeacherFeedback(sub.teacher_feedback || '');
    setGradingSuccess(false);
  };

  const handleSaveGrade = () => {
    if (!selectedStudentSubmission || !onGradeSubmission) return;
    onGradeSubmission(selectedStudentSubmission.id, gradeScore, gradeLevel, teacherFeedback);
    setGradingSuccess(true);
    setTimeout(() => setGradingSuccess(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Tarea Regular • Evidencias
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  Educación Religiosa
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-xs">
                  {activity.grade}° Secundaria "{activity.section}"
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{activity.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 self-start md:self-auto">
            <div className="text-right">
              <p className="text-[10px] text-blue-200 uppercase font-semibold">Puntaje Máximo</p>
              <p className="text-lg font-bold text-amber-300">{activity.max_score || 20} pts</p>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase font-semibold">Fecha Límite</p>
              <p className="text-xs font-medium text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-300" />
                {activity.due_date ? new Date(activity.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          
          {/* Pedagogical Competencies Header */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Competencias CNEB Desarrolladas:</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {activity.competencies.map((compId: string) => {
                  const comp = RELIGION_COMPETENCIES.find((c: any) => c.id === compId);
                  return (
                    <span key={compId} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl font-medium">
                      🎯 {comp?.name || compId}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Teacher vs Student Layout */}
          {isTeacher ? (
            /* TEACHER VIEW: Submissions list & Grading */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Student Submissions Roster */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    Entregas de Estudiantes ({allSubmissions.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {allSubmissions.filter(s => s.status === 'Calificado').length} calificados
                  </span>
                </div>

                {allSubmissions.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Aún no hay entregas</p>
                    <p className="text-xs text-slate-400 mt-1">Los estudiantes de {activity.grade}° "{activity.section}" verán esta tarea en su panel para enviar sus evidencias.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {allSubmissions.map((sub) => {
                      const isSelected = selectedStudentSubmission?.id === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectStudent(sub)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-blue-50/80 border-blue-400 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {sub.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{sub.student_name}</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(sub.submitted_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {sub.status === 'Calificado' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                                {sub.achievement_level} • {sub.score}/20
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Assignment Instructions reference */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Instrucciones Asignadas:</h4>
                  <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                    {activity.description}
                  </div>
                </div>
              </div>

              {/* Right Column: Grading workspace */}
              <div className="lg:col-span-7">
                {selectedStudentSubmission ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Revisión de Evidencia</span>
                        <h3 className="text-lg font-bold text-slate-800">{selectedStudentSubmission.student_name}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedStudentSubmission.status === 'Calificado' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedStudentSubmission.status}
                      </span>
                    </div>

                    {/* Student's Work */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contenido de la Evidencia:</label>
                      {selectedStudentSubmission.evidence_text && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedStudentSubmission.evidence_text}
                        </div>
                      )}

                      {selectedStudentSubmission.evidence_link && (
                        <a 
                          href={selectedStudentSubmission.evidence_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                          <span className="truncate">{selectedStudentSubmission.evidence_link}</span>
                        </a>
                      )}

                      {selectedStudentSubmission.evidence_file_name && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span>{selectedStudentSubmission.evidence_file_name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">Archivo Adjunto</span>
                        </div>
                      )}
                    </div>

                    {/* Grading Form */}
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Nivel de Logro (MINEDU)</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['AD', 'A', 'B', 'C'] as const).map(lvl => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => {
                                  setGradeLevel(lvl);
                                  if (lvl === 'AD') setGradeScore(19);
                                  if (lvl === 'A') setGradeScore(16);
                                  if (lvl === 'B') setGradeScore(12);
                                  if (lvl === 'C') setGradeScore(9);
                                }}
                                className={`py-2 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                  gradeLevel === lvl 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Nota Numérica (0-20)</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={gradeScore}
                            onChange={(e) => {
                              const val = Math.min(20, Math.max(0, Number(e.target.value)));
                              setGradeScore(val);
                              if (val >= 18) setGradeLevel('AD');
                              else if (val >= 14) setGradeLevel('A');
                              else if (val >= 11) setGradeLevel('B');
                              else setGradeLevel('C');
                            }}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Retroalimentación Formativa */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700">Retroalimentación Formativa</label>
                          <span className="text-[11px] text-slate-400">Recomendaciones pedagógicas</span>
                        </div>
                        <textarea
                          rows={3}
                          value={teacherFeedback}
                          onChange={(e) => setTeacherFeedback(e.target.value)}
                          placeholder="Escribe comentarios formativos para el estudiante..."
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                        
                        {/* Quick feedback chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {feedbackTemplates.map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setTeacherFeedback(tpl)}
                              className="text-[10px] bg-white border border-slate-200 hover:border-blue-400 px-2 py-1 rounded-lg text-slate-600 transition-colors text-left"
                            >
                              💡 {tpl.slice(0, 42)}...
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        {gradingSuccess && (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Calificación guardada exitosamente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveGrade}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          Guardar Calificación
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl text-slate-400 text-center">
                    Selecciona un estudiante de la lista para revisar su evidencia y calificar.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STUDENT VIEW: Read Instructions & Submit */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Instructions and Rubric */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Consigna y Orientaciones Pedagógicas
                  </h3>
                  <div className="prose prose-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {activity.description}
                  </div>
                </div>

                {/* Teacher feedback alert if already graded */}
                {existingSubmission?.status === 'Calificado' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-6 h-6 text-emerald-600" />
                        <h4 className="font-bold text-emerald-900 text-base">¡Tu entrega ha sido Calificada!</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900">
                          Nivel: {existingSubmission.achievement_level}
                        </span>
                        <span className="text-sm font-black px-3 py-1 rounded-lg bg-emerald-600 text-white shadow-sm">
                          {existingSubmission.score} / 20
                        </span>
                      </div>
                    </div>
                    {existingSubmission.teacher_feedback && (
                      <div className="bg-white/80 rounded-2xl p-4 border border-emerald-100 text-xs text-slate-700 italic">
                        "{existingSubmission.teacher_feedback}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Submission Form */}
              <div className="lg:col-span-5">
                <div className="bg-white border-2 border-blue-100 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      Espacio de Entrega
                    </h3>
                    {existingSubmission ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {existingSubmission.status}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Sin entregar
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    
                    {/* Textual reflection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Respuesta / Reflexión Escrita:
                      </label>
                      <textarea
                        rows={4}
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        placeholder="Redacta aquí tu análisis o síntesis del proyecto solidario..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>

                    {/* Google Drive / Web Link */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                        Enlace de Google Drive / Canva / Documento:
                      </label>
                      <input
                        type="url"
                        value={evidenceLink}
                        onChange={(e) => setEvidenceLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* File Attachment Dropzone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Adjuntar Archivo (PDF, Word, Imagen):
                      </label>
                      <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all">
                        <UploadCloud className="w-8 h-8 text-blue-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          {selectedFileName ? selectedFileName : 'Haz clic para seleccionar tu archivo'}
                        </span>
                        <span className="text-[10px] text-slate-400">PDF, DOCX o JPG hasta 25MB</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>

                    {uploadSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ¡Tu evidencia ha sido entregada con éxito!
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Guardando entrega...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {existingSubmission ? 'Actualizar Mi Entrega' : 'Entregar Tarea'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>Área Curricular: <strong>Educación Religiosa</strong> • Creciendo Juntos 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
