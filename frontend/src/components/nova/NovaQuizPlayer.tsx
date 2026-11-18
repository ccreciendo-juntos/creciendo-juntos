import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy, 
  ArrowRight, 
  ArrowLeft, 
  X
} from 'lucide-react';
import type { NovaActivity, NovaSubmission } from './types';
import { RELIGION_AREA_NAME } from '../velox/religionCompetencies';

interface NovaQuizPlayerProps {
  activity: NovaActivity;
  student: {
    id: string;
    name: string;
    email: string;
  };
  onComplete: (submission: NovaSubmission) => void;
  onClose: () => void;
}

export const NovaQuizPlayer: React.FC<NovaQuizPlayerProps> = ({
  activity,
  student,
  onComplete,
  onClose,
}) => {
  const questions = activity.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; level: 'AD' | 'A' | 'B' | 'C' } | null>(null);

  // Timer countdown
  const [secondsLeft, setSecondsLeft] = useState((activity.time_limit || 15) * 60);

  useEffect(() => {
    if (submitted || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, secondsLeft]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const calculateGrade = () => {
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points || 5;
      const selectedOptId = answers[q.id];
      const correctOpt = q.options?.find(o => o.isCorrect);
      if (correctOpt && correctOpt.id === selectedOptId) {
        earnedPoints += q.points || 5;
      }
    });

    // Scale to max 20 if needed
    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 20) : 0;
    let level: 'AD' | 'A' | 'B' | 'C' = 'C';
    if (finalScore >= 18) level = 'AD';
    else if (finalScore >= 14) level = 'A';
    else if (finalScore >= 11) level = 'B';
    else level = 'C';

    return { score: finalScore, maxScore: 20, level };
  };

  const handleAutoSubmit = () => {
    const res = calculateGrade();
    setResult(res);
    setSubmitted(true);

    const submission: NovaSubmission = {
      id: `sub_${Date.now()}`,
      activity_id: activity.id,
      student_id: student.id,
      student_name: student.name,
      grade: activity.grade,
      section: activity.section,
      submitted_at: new Date().toISOString(),
      status: 'Calificado',
      answers,
      score: res.score,
      achievement_level: res.level,
      teacher_feedback: 'Evaluación calificada automáticamente por el sistema NOVA Creciendo Juntos.'
    };

    onComplete(submission);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAutoSubmit();
  };

  const currentQ = questions[currentIdx];
  const progressPercent = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Top Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                ✝ {RELIGION_AREA_NAME}
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Evaluación Activa</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1">{activity.title}</h3>
          </div>

          <div className="flex items-center gap-3">
            {!submitted && (
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5" /> {formatTimer(secondsLeft)}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Ribbon */}
        {!submitted && (
          <div className="w-full bg-slate-100 h-1.5 shrink-0">
            <div 
              className="bg-blue-600 h-1.5 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 md:p-8 flex-1">
          {submitted && result ? (
            /* RESULTS / CONGRATULATIONS SCREEN */
            <div className="text-center space-y-6 py-6 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-300/40">
                <Trophy className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">¡EVALUACIÓN COMPLETADA CON ÉXITO!</span>
                <h2 className="text-3xl font-black text-slate-900 mt-1">Tu Calificación</h2>
                <div className="flex justify-center items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black text-blue-700">{result.score}</span>
                  <span className="text-xl font-bold text-slate-400">/ 20 pts</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-4 py-1.5 rounded-xl text-sm font-black shadow-sm ${
                    result.level === 'AD' ? 'bg-indigo-600 text-white' :
                    result.level === 'A' ? 'bg-emerald-600 text-white' :
                    result.level === 'B' ? 'bg-amber-500 text-slate-900' : 'bg-rose-600 text-white'
                  }`}>
                    Nivel de Logro: {result.level} ({
                      result.level === 'AD' ? 'Logro Destacado' :
                      result.level === 'A' ? 'Logro Esperado' :
                      result.level === 'B' ? 'En Proceso' : 'En Inicio'
                    })
                  </span>
                </div>
              </div>

              {/* Question Review Breakdown */}
              <div className="space-y-4 pt-6 text-left max-h-[40vh] overflow-y-auto pr-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Revisión Formativa de Reactivos</h4>
                {questions.map((q, idx) => {
                  const userOptId = answers[q.id];
                  const correctOpt = q.options?.find(o => o.isCorrect);
                  const isCorrect = correctOpt && correctOpt.id === userOptId;

                  return (
                    <div key={q.id} className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span className="font-bold text-slate-900">{idx + 1}. {q.text}</span>
                      </div>

                      <div className="pl-6 text-[11px] text-slate-600">
                        <p><strong>Tu respuesta:</strong> {q.options?.find(o => o.id === userOptId)?.text || 'Sin responder'}</p>
                        {!isCorrect && correctOpt && (
                          <p className="text-emerald-700 font-semibold mt-0.5"><strong>Respuesta correcta:</strong> {correctOpt.text}</p>
                        )}
                        <p className="mt-1 italic text-slate-500">
                          {isCorrect ? q.feedbackCorrect : q.feedbackIncorrect}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
                >
                  Cerrar Evaluación
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* ACTIVE QUESTION VIEW */
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  Pregunta {currentIdx + 1} de {questions.length}
                </span>
                <span className="font-bold text-slate-400">
                  Valor: {currentQ.points || 5} puntos
                </span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-base font-black text-slate-900 leading-relaxed">
                  {currentQ.text}
                </h4>
              </div>

              {/* Options list */}
              {currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map(opt => {
                    const isSelected = answers[currentQ.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                        className={`p-4 rounded-2xl border-2 text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-sm scale-[1.01]'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="leading-relaxed">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-400 text-xs">No hay preguntas disponibles para esta evaluación.</p>
          )}
        </div>

        {/* Bottom Navigation Controls */}
        {!submitted && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Enviar Respuestas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
