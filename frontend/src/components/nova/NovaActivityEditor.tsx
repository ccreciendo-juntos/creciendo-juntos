import React, { useState } from 'react';
import { 
  ClipboardList, 
  HelpCircle, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Download, 
  Eye
} from 'lucide-react';
import type { 
  NovaActivity, 
  NovaActivityType, 
  NovaQuizQuestion, 
  NovaQuestionType, 
  NovaQuestionOption 
} from './types';
import { RELIGION_AREA_NAME, RELIGION_COMPETENCIES } from '../velox/religionCompetencies';

interface NovaActivityEditorProps {
  initialActivity?: NovaActivity | null;
  activityType: NovaActivityType;
  defaultGrade?: number;
  defaultSection?: string;
  onSave: (activity: NovaActivity) => void;
  onCancel: () => void;
}

export const NovaActivityEditor: React.FC<NovaActivityEditorProps> = ({
  initialActivity,
  activityType,
  defaultGrade = 4,
  defaultSection = 'B',
  onSave,
  onCancel,
}) => {
  const isQuiz = activityType === 'quiz';
  const [activeTab, setActiveTab] = useState<'config' | 'questions'>('config');
  const [previewMode, setPreviewMode] = useState(false);

  // Activity Configuration State
  const [title, setTitle] = useState(initialActivity?.title || '');
  const [description, setDescription] = useState(initialActivity?.description || '');
  const [grade, setGrade] = useState<number>(initialActivity?.grade || defaultGrade);
  const [section, setSection] = useState<string>(initialActivity?.section || defaultSection);
  const [dueDate, setDueDate] = useState<string>(() => {
    if (initialActivity?.due_date) return initialActivity.due_date;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().slice(0, 16);
  });
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>(
    initialActivity?.competencies || ['rel_c1', 'rel_c2']
  );
  const [timeLimit, setTimeLimit] = useState<number>(initialActivity?.time_limit || 15);
  const [maxScore, setMaxScore] = useState<number>(initialActivity?.max_score || 20);

  // Quiz Questions State
  const [questions, setQuestions] = useState<NovaQuizQuestion[]>(() => {
    if (initialActivity?.questions && initialActivity.questions.length > 0) {
      return initialActivity.questions;
    }
    if (isQuiz) {
      return [
        {
          id: 'q_' + Date.now() + '_1',
          text: '¿Cuál es el valor cristiano primordial que promueve la encíclica Fratelli Tutti frente a los desafíos éticos de la juventud?',
          type: 'multiple_choice',
          points: 5,
          required: true,
          feedbackCorrect: '¡Correcto! La fraternidad universal y la amistad social son los pilares de la encíclica.',
          feedbackIncorrect: 'Revisa la enseñanza sobre fraternidad universal y amistad social frente al individualismo.',
          options: [
            { id: 'opt_1', text: 'El éxito individual por encima de las necesidades colectivas.', isCorrect: false },
            { id: 'opt_2', text: 'La fraternidad universal y la amistad social sin fronteras.', isCorrect: true },
            { id: 'opt_3', text: 'El aislamiento comunitario para evitar conflictos.', isCorrect: false },
            { id: 'opt_4', text: 'La competencia económica como único motor social.', isCorrect: false }
          ]
        }
      ];
    }
    return [];
  });

  const toggleCompetency = (compId: string) => {
    setSelectedCompetencies(prev => 
      prev.includes(compId) ? prev.filter(c => c !== compId) : [...prev, compId]
    );
  };

  // Add Question to Quiz
  const handleAddQuestion = (type: NovaQuestionType = 'multiple_choice') => {
    const newQ: NovaQuizQuestion = {
      id: 'q_' + Date.now(),
      text: '',
      type,
      points: 5,
      required: true,
      feedbackCorrect: '¡Respuesta correcta!',
      feedbackIncorrect: 'Respuesta incorrecta. Repasa las enseñanzas de clase.',
      options: type === 'multiple_choice' || type === 'checkboxes' ? [
        { id: 'opt_' + Date.now() + '_1', text: 'Opción 1', isCorrect: true },
        { id: 'opt_' + Date.now() + '_2', text: 'Opción 2', isCorrect: false }
      ] : undefined
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const updateQuestion = (qId: string, updates: Partial<NovaQuizQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...updates } : q));
  };

  const removeQuestion = (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const addOption = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || !q.options) return q;
      const newOpt: NovaQuestionOption = {
        id: 'opt_' + Date.now(),
        text: `Opción ${q.options.length + 1}`,
        isCorrect: false
      };
      return { ...q, options: [...q.options, newOpt] };
    }));
  };

  const updateOption = (qId: string, optId: string, updates: Partial<NovaQuestionOption>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || !q.options) return q;
      // If setting isCorrect to true on multiple choice, set all others to false
      let updatedOptions = q.options.map(o => o.id === optId ? { ...o, ...updates } : o);
      if (q.type === 'multiple_choice' && updates.isCorrect) {
        updatedOptions = q.options.map(o => o.id === optId ? { ...o, isCorrect: true } : { ...o, isCorrect: false });
      }
      return { ...q, options: updatedOptions };
    }));
  };

  const removeOption = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || !q.options || q.options.length <= 2) return q;
      return { ...q, options: q.options.filter(o => o.id !== optId) };
    }));
  };

  // AI Suggestion Handler for Religion prompts
  const handleAISuggest = () => {
    if (isQuiz) {
      setTitle('Cuestionario Formativo: Fe, Ética y Dignidad en la Educación Religiosa');
      setDescription('Evaluación interactiva para verificar la apropiación de las competencias C1 y C2 del CNEB sobre el mensaje evangélico y el compromiso comunitario.');
    } else {
      setTitle('Tarea Regular: Ensayo Reflexivo sobre el Amor al Prójimo y la Justicia Social');
      setDescription(`### Guía de la Actividad:
1. **Fundamentación Bíblica:** Analiza Mateo 25, 31-46 (*"Tuve hambre y me diste de comer..."*).
2. **Propuesta Ética:** Identifica un caso de exclusión en tu entorno y redacta una propuesta de acción solidaria inspirada en la doctrina social de la Iglesia.
3. **Formato:** Entrega tu trabajo en PDF o Word (mínimo 300 palabras).
4. **Criterios de Evaluación:** Coherencia doctrinal, propuesta constructiva y fundamentación bíblica.`);
    }
  };

  // Import Word Simulation
  const handleImportWord = () => {
    const sampleImported: NovaQuizQuestion[] = [
      {
        id: 'q_imp_1',
        text: '¿Cómo define San Agustín la búsqueda interior de la Verdad y el encuentro con Dios?',
        type: 'multiple_choice',
        points: 5,
        required: true,
        options: [
          { id: 'opt_imp_1', text: 'Como una búsqueda externa basada solo en ritos mecánicos.', isCorrect: false },
          { id: 'opt_imp_2', text: '"No vayas fuera, entra en ti mismo; en el hombre interior habita la verdad."', isCorrect: true },
          { id: 'opt_imp_3', text: 'Como un ejercicio meramente filosófico sin impacto espiritual.', isCorrect: false }
        ]
      },
      {
        id: 'q_imp_2',
        text: 'Menciona y explica una obra de misericordia corporal y su aplicación en tu aula.',
        type: 'paragraph',
        points: 5,
        required: true
      }
    ];
    setQuestions(prev => [...prev, ...sampleImported]);
    alert('✓ 2 preguntas importadas con éxito desde el documento Word de evaluación.');
  };

  // Final Submit / Publish
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor ingrese el título de la actividad');
      return;
    }

    const newActivity: NovaActivity = {
      id: initialActivity?.id || `act_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type: activityType,
      area: RELIGION_AREA_NAME,
      grade,
      section,
      due_date: dueDate,
      created_at: initialActivity?.created_at || new Date().toISOString(),
      competencies: selectedCompetencies,
      questions: isQuiz ? questions : undefined,
      max_score: maxScore,
      time_limit: isQuiz ? timeLimit : undefined,
      status: 'active',
      allow_file_upload: true,
      allow_link: true,
      allow_text: true
    };

    onSave(newActivity);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in font-sans">
      {/* TOP HEADER (Exact mirror of Nova Activity Editor - Image 3 & 4) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
            isQuiz ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-blue-600 shadow-blue-500/20'
          }`}>
            {isQuiz ? <HelpCircle className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">
              ESTUDIO NOVA • {isQuiz ? 'CUESTIONARIO' : 'TAREA REGULAR'}
            </span>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {initialActivity ? 'Editar Actividad' : 'Nueva Actividad'}: {isQuiz ? 'Cuestionario de Evaluación' : 'Tarea Regular de Evidencias'}
            </h2>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {isQuiz && (
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3.5 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" /> {previewMode ? 'Editor' : 'Vista Previa'}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>

          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" /> PUBLICAR
          </button>
        </div>
      </div>

      {/* TABS (Image 4) */}
      {isQuiz && (
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 border-b-2 text-xs font-black transition-colors cursor-pointer ${
              activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚙ CONFIGURACIÓN PEDAGÓGICA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`py-3 px-4 border-b-2 text-xs font-black transition-colors cursor-pointer ${
              activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📝 PREGUNTAS Y ACTIVIDAD ({questions.length})
          </button>
        </div>
      )}

      {/* TAB CONTENT */}
      <div className="p-6 md:p-8">
        {/* PREVIEW MODE FOR QUIZ */}
        {previewMode && isQuiz ? (
          <div className="space-y-6 max-w-3xl mx-auto p-6 bg-slate-50 rounded-3xl border border-slate-200">
            <div className="text-center pb-4 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">VISTA PREVIA ESTUDIANTE</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{title || 'Título del Cuestionario'}</h3>
              <p className="text-xs text-slate-500 mt-1">{description || 'Instrucciones del examen...'}</p>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-800">
                      {idx + 1}. {q.text || 'Pregunta sin texto'}
                    </span>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {q.points} pts
                    </span>
                  </div>

                  {q.options && (
                    <div className="space-y-2 pt-1">
                      {q.options.map(opt => (
                        <div key={opt.id} className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                          opt.isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            opt.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                          }`}>
                            {opt.isCorrect ? '✓' : ''}
                          </span>
                          {opt.text}
                          {opt.isCorrect && <span className="ml-auto text-[10px] uppercase font-black text-emerald-600">Correcta</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (!isQuiz || activeTab === 'config') ? (
          /* CONFIGURATION TAB (Image 3) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Desarrollo Curricular (CNEB) */}
            <div className="lg:col-span-5 bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Desarrollo Curricular (CNEB)
                </span>
                <label className="block text-xs font-bold text-slate-700 mt-1 mb-1.5">Área Curricular</label>
                <div className="form-control text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 py-2.5 px-3 rounded-xl flex items-center gap-2">
                  <span>✝</span> {RELIGION_AREA_NAME}
                </div>
              </div>

              {/* Competencias Oficiales */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Competencias del Área</label>
                {RELIGION_COMPETENCIES.map(comp => (
                  <label
                    key={comp.id}
                    className={`block p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      selectedCompetencies.includes(comp.id)
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedCompetencies.includes(comp.id)}
                        onChange={() => toggleCompetency(comp.id)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="leading-tight text-[11px]">{comp.shortName}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Classroom: Grade and Section */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Grado</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(parseInt(e.target.value))}
                    className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white"
                  >
                    {[1, 2, 3, 4, 5].map(g => (
                      <option key={g} value={g}>{g}° de Secundaria</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Sección</label>
                  <select
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white text-center"
                  >
                    <option value="A">Sección A</option>
                    <option value="B">Sección B</option>
                    <option value="C">Sección C</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Max Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Límite</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="form-control text-xs font-medium py-2 px-2.5 rounded-xl border border-slate-300 w-full bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Puntaje Máximo</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={e => setMaxScore(parseInt(e.target.value) || 20)}
                    className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white text-center"
                  />
                </div>
              </div>

              {/* Time limit for quiz */}
              {isQuiz && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Límite de Tiempo (minutos)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(parseInt(e.target.value) || 0)}
                    className="form-control text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 w-full bg-white text-center"
                    placeholder="0 = Sin límite"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Identidad y Guía */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                    IDENTIDAD Y GUÍA
                  </span>
                  <h3 className="text-base font-black text-slate-800">Diseño de la Experiencia</h3>
                </div>

                <button
                  type="button"
                  onClick={handleAISuggest}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Sugerencia Pedagógica
                </button>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Actividad</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Análisis del Bicentenario a la luz del Evangelio y la Doctrina Social..."
                  className="w-full text-sm font-semibold p-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Rich Instructions / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instrucciones y Guía Pedagógica para el Alumno
                </label>
                <textarea
                  rows={8}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalla los pasos de la actividad, lecturas recomendadas del cuaderno Creciendo Juntos, y criterios de evaluación..."
                  className="w-full text-xs font-mono p-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                ></textarea>
              </div>

              {/* Jump to Questions button if Quiz */}
              {isQuiz && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className="inline-flex items-center gap-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-2xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    Continuar al Editor de Preguntas ({questions.length}) →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* QUESTIONS EDITOR TAB (Image 5) */
          <div className="space-y-8">
            {/* Top Toolbar Ribbon for Questions */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-6 rounded-2xl border border-emerald-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  ESTUDIO DE EVALUACIÓN NOVA
                </span>
                <h3 className="text-xl font-black text-slate-900">Editor de Evaluación</h3>
                <p className="text-xs text-slate-600 max-w-xl">
                  Diseña experiencias de evaluación fundamentadas. Puedes construir reactivos manualmente o importar estructuras desde documentos Word.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleImportWord}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> IMPORTAR WORD
                </button>

                <button
                  type="button"
                  onClick={() => alert('Descargando plantilla base en formato Word para estructurar reactivos...')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" /> PLANTILLA BASE
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative">
                  {/* Question Header & Controls */}
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Reactivo {qIdx + 1}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Points Selector */}
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500">Puntaje:</span>
                        <input
                          type="number"
                          value={q.points}
                          onChange={e => updateQuestion(q.id, { points: parseInt(e.target.value) || 1 })}
                          className="w-12 text-center text-xs font-black bg-transparent border-none focus:outline-none text-blue-700"
                        />
                      </div>

                      {/* Question Type Selector */}
                      <select
                        value={q.type}
                        onChange={e => updateQuestion(q.id, { type: e.target.value as NovaQuestionType })}
                        className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="multiple_choice">Varias opciones (Única)</option>
                        <option value="checkboxes">Casillas (Múltiple)</option>
                        <option value="short_answer">Respuesta corta</option>
                        <option value="paragraph">Párrafo / Desarrollo</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Enunciado de la Pregunta
                    </label>
                    <input
                      type="text"
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                      placeholder="Escriba aquí la pregunta o reactivo..."
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Options (for Multiple Choice & Checkboxes) */}
                  {(q.type === 'multiple_choice' || q.type === 'checkboxes') && q.options && (
                    <div className="space-y-2.5 pt-2">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Opciones de Respuesta (Marca el círculo verde para la respuesta correcta)
                      </span>

                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateOption(q.id, opt.id, { isCorrect: !opt.isCorrect })}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                              opt.isCorrect 
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs' 
                                : 'border-slate-300 bg-white hover:border-emerald-400'
                            }`}
                            title="Marcar como correcta"
                          >
                            {opt.isCorrect && <span className="text-[10px] font-black">✓</span>}
                          </button>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => updateOption(q.id, opt.id, { text: e.target.value })}
                            className={`flex-1 text-xs p-2.5 rounded-xl border transition-all ${
                              opt.isCorrect 
                                ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950 font-bold' 
                                : 'border-slate-300 bg-white'
                            }`}
                            placeholder={`Opción ${oIdx + 1}...`}
                          />

                          {q.options!.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, opt.id)}
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir Opción
                      </button>
                    </div>
                  )}

                  {/* Formative Feedback Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">
                        Retroalimentación Si Acierta
                      </label>
                      <input
                        type="text"
                        value={q.feedbackCorrect || ''}
                        onChange={e => updateQuestion(q.id, { feedbackCorrect: e.target.value })}
                        placeholder="Ej: ¡Excelente razonamiento ético!..."
                        className="form-control text-xs w-full p-2 rounded-xl border border-emerald-200 bg-emerald-50/30 text-emerald-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-rose-700 uppercase mb-1">
                        Retroalimentación Si Falla
                      </label>
                      <input
                        type="text"
                        value={q.feedbackIncorrect || ''}
                        onChange={e => updateQuestion(q.id, { feedbackIncorrect: e.target.value })}
                        placeholder="Ej: Recuerda revisar el capítulo de Sacramentos..."
                        className="form-control text-xs w-full p-2 rounded-xl border border-rose-200 bg-rose-50/30 text-rose-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Question Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="inline-flex items-center gap-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> AÑADIR PREGUNTA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
