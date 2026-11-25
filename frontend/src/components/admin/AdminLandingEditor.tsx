import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Globe, Sparkles, CheckCircle2, MessageSquare, LayoutTemplate, Video, Plus, Trash2 } from 'lucide-react';
import { request } from '../../services/api';
import { DEFAULT_LANDING_CONFIG, type LandingConfig, type ExperienceVideo } from './landingConfig';

function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2] && match[2].length === 11 ? match[2] : null;
}

interface AdminLandingEditorProps {
  config: LandingConfig;
  onConfigSaved: (next: LandingConfig) => void;
}

export const AdminLandingEditor: React.FC<AdminLandingEditorProps> = ({ config, onConfigSaved }) => {
  const [form, setForm] = useState<LandingConfig>(config);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await request('/admin/site-config', 'PUT', form);
      if (res.success) {
        onConfigSaved(form);
        localStorage.setItem('creciendo_landing_config', JSON.stringify(form));
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3500);
      } else {
        alert(res.error?.message || 'Error al guardar la página de inicio.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restaurar todos los textos de la página de inicio a los valores por defecto?')) return;
    setForm(DEFAULT_LANDING_CONFIG);
    setSaving(true);
    try {
      const res = await request('/admin/site-config', 'PUT', DEFAULT_LANDING_CONFIG);
      if (res.success) {
        onConfigSaved(DEFAULT_LANDING_CONFIG);
        localStorage.setItem('creciendo_landing_config', JSON.stringify(DEFAULT_LANDING_CONFIG));
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-blue-600" /> Editor Completo de Página de Inicio
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Modifica los títulos, textos promocionales, botones, estadísticas, WhatsApp y pie de página en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" /> ¡Cambios publicados!
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar Defecto
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Publicando...' : 'Guardar y Publicar'}
          </button>
        </div>
      </div>

      {/* Section 1: Barra Superior y Marca */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-black text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Globe className="w-4 h-4 text-emerald-600" /> 1. Barra Superior, Marca y Contacto
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Marca (Navbar)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo de Marca</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.brandSubtitle} onChange={(e) => setForm({ ...form, brandSubtitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Etiqueta Barra Superior</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.topBadge} onChange={(e) => setForm({ ...form, topBadge: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Texto Barra Superior</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.topBannerText} onChange={(e) => setForm({ ...form, topBannerText: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo de Contacto</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Número de WhatsApp (con código país, ej. 51999999999)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Section 2: Hero Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-black text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sparkles className="w-4 h-4 text-rose-600" /> 2. Sección Principal (Hero) y Botones CTA
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Píldora Superior (Badge Hero)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroPill} onChange={(e) => setForm({ ...form, heroPill: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Principal (Inicio)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroTitleStart} onChange={(e) => setForm({ ...form, heroTitleStart: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Texto Resaltado (Color Verde)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold text-teal-700" value={form.heroTitleHighlight} onChange={(e) => setForm({ ...form, heroTitleHighlight: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Principal (Final)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroTitleEnd} onChange={(e) => setForm({ ...form, heroTitleEnd: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo / Descripción Hero</label>
            <textarea rows={2} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Cita Inspiradora</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroQuote} onChange={(e) => setForm({ ...form, heroQuote: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Autor de la Cita</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.heroQuoteAuthor} onChange={(e) => setForm({ ...form, heroQuoteAuthor: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Botón Primario (Rojo)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.ctaPrimaryText} onChange={(e) => setForm({ ...form, ctaPrimaryText: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Botón Secundario (Verde)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.ctaSecondaryText} onChange={(e) => setForm({ ...form, ctaSecondaryText: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Botón Terciario (Blanco)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.ctaTertiaryText} onChange={(e) => setForm({ ...form, ctaTertiaryText: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Section 3: Estadísticas, Simulacros y Pie de Página */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-black text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" /> 3. Estadísticas, Simulacros y Pie de Página
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cifra 1</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.stat1Value} onChange={(e) => setForm({ ...form, stat1Value: e.target.value })} />
            <input type="text" className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-xl mt-1" value={form.stat1Label} onChange={(e) => setForm({ ...form, stat1Label: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cifra 2</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.stat2Value} onChange={(e) => setForm({ ...form, stat2Value: e.target.value })} />
            <input type="text" className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-xl mt-1" value={form.stat2Label} onChange={(e) => setForm({ ...form, stat2Label: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cifra 3</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.stat3Value} onChange={(e) => setForm({ ...form, stat3Value: e.target.value })} />
            <input type="text" className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-xl mt-1" value={form.stat3Label} onChange={(e) => setForm({ ...form, stat3Label: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cifra 4</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.stat4Value} onChange={(e) => setForm({ ...form, stat4Value: e.target.value })} />
            <input type="text" className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-xl mt-1" value={form.stat4Label} onChange={(e) => setForm({ ...form, stat4Label: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Botón WhatsApp Flotante</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.whatsappLabel} onChange={(e) => setForm({ ...form, whatsappLabel: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Pie de Página (Footer)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.footerBrandTitle} onChange={(e) => setForm({ ...form, footerBrandTitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Texto Derechos Reservados (Footer)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.footerCopyright} onChange={(e) => setForm({ ...form, footerCopyright: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Section 3B: Sección Simulacros 100% Personalizable */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-black text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> 3B. Sección Simulacros (100% Personalizable)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Insignia Amarilla (Badge)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.simulacroBadge} onChange={(e) => setForm({ ...form, simulacroBadge: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Principal Simulacros</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.simulacroTitle} onChange={(e) => setForm({ ...form, simulacroTitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Texto del Botón CTA</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold" value={form.simulacroButton} onChange={(e) => setForm({ ...form, simulacroButton: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción de Simulacros</label>
            <textarea rows={2} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.simulacroDesc} onChange={(e) => setForm({ ...form, simulacroDesc: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Beneficio 1</label>
            <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg" value={form.simulacroFeat1} onChange={(e) => setForm({ ...form, simulacroFeat1: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Beneficio 2</label>
            <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg" value={form.simulacroFeat2} onChange={(e) => setForm({ ...form, simulacroFeat2: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Beneficio 3</label>
            <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg" value={form.simulacroFeat3} onChange={(e) => setForm({ ...form, simulacroFeat3: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Beneficio 4</label>
            <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg" value={form.simulacroFeat4} onChange={(e) => setForm({ ...form, simulacroFeat4: e.target.value })} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-[11px] font-black text-slate-700 uppercase">Tarjeta Lateral Derecha (Métricas y Progreso)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Etiqueta Superior Tarjeta</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" value={form.simulacroCardBadge} onChange={(e) => setForm({ ...form, simulacroCardBadge: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Etiqueta Derecha (ej. CNEB • MINEDU)</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" value={form.simulacroCardTag} onChange={(e) => setForm({ ...form, simulacroCardTag: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Métrica 1 (Valor / Etiqueta)</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold" value={form.simulacroMetric1Val} onChange={(e) => setForm({ ...form, simulacroMetric1Val: e.target.value })} />
              <input type="text" className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg mt-1" value={form.simulacroMetric1Lbl} onChange={(e) => setForm({ ...form, simulacroMetric1Lbl: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Métrica 2 (Valor / Etiqueta)</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold" value={form.simulacroMetric2Val} onChange={(e) => setForm({ ...form, simulacroMetric2Val: e.target.value })} />
              <input type="text" className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg mt-1" value={form.simulacroMetric2Lbl} onChange={(e) => setForm({ ...form, simulacroMetric2Lbl: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Métrica 3 (Valor / Etiqueta)</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold" value={form.simulacroMetric3Val} onChange={(e) => setForm({ ...form, simulacroMetric3Val: e.target.value })} />
              <input type="text" className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg mt-1" value={form.simulacroMetric3Lbl} onChange={(e) => setForm({ ...form, simulacroMetric3Lbl: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Texto Progreso Izquierda</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" value={form.simulacroProgressLabel} onChange={(e) => setForm({ ...form, simulacroProgressLabel: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Texto Progreso Derecha</label>
              <input type="text" className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" value={form.simulacroProgressText} onChange={(e) => setForm({ ...form, simulacroProgressText: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Porcentaje Barra (0-100)</label>
              <input type="number" min={0} max={100} className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold" value={form.simulacroProgressPct} onChange={(e) => setForm({ ...form, simulacroProgressPct: Math.min(100, Math.max(0, Number(e.target.value))) })} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Galería Multimedia - Videos de YouTube */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-600" /> 4. Videos de YouTube: Experiencia Creciendo Juntos en Acción
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pega enlaces de YouTube (watch, youtu.be o Shorts); la miniatura se detecta automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const newVid: ExperienceVideo = {
                id: `vid_${Date.now()}`,
                tag: 'Nuevo Video',
                title: 'Título del Video Educativo',
                desc: 'Descripción breve del video o testimonio.',
                duration: '2:30',
                bg: '',
                videoUrl: '',
              };
              setForm({ ...form, experienceVideos: [...(form.experienceVideos || []), newVid] });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3.5 py-2 rounded-xl cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Video de YouTube
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título de Sección</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.experienceTitle || ''} onChange={(e) => setForm({ ...form, experienceTitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo de Sección</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.experienceSubtitle || ''} onChange={(e) => setForm({ ...form, experienceSubtitle: e.target.value })} />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {(form.experienceVideos || []).map((vid, idx) => {
            const ytId = getYoutubeId(vid.videoUrl || '');
            const previewThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : vid.bg;
            return (
              <div key={vid.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">Video #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, experienceVideos: form.experienceVideos.filter((_, i) => i !== idx) })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {previewThumb && (
                    <div className="md:col-span-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
                      <img src={previewThumb} alt={vid.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`${previewThumb ? 'md:col-span-9' : 'md:col-span-12'} grid grid-cols-1 sm:grid-cols-3 gap-2.5`}>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Etiqueta</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        value={vid.tag}
                        onChange={(e) => {
                          const next = [...form.experienceVideos];
                          next[idx] = { ...vid, tag: e.target.value };
                          setForm({ ...form, experienceVideos: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Título del Video</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        value={vid.title}
                        onChange={(e) => {
                          const next = [...form.experienceVideos];
                          next[idx] = { ...vid, title: e.target.value };
                          setForm({ ...form, experienceVideos: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Duración (ej. 3:15)</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        value={vid.duration}
                        onChange={(e) => {
                          const next = [...form.experienceVideos];
                          next[idx] = { ...vid, duration: e.target.value };
                          setForm({ ...form, experienceVideos: next });
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Enlace de YouTube (o MP4)</label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        value={vid.videoUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          const detectedId = getYoutubeId(url);
                          const next = [...form.experienceVideos];
                          next[idx] = {
                            ...vid,
                            videoUrl: url,
                            bg: detectedId ? `https://img.youtube.com/vi/${detectedId}/hqdefault.jpg` : vid.bg,
                          };
                          setForm({ ...form, experienceVideos: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Descripción breve</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        value={vid.desc}
                        onChange={(e) => {
                          const next = [...form.experienceVideos];
                          next[idx] = { ...vid, desc: e.target.value };
                          setForm({ ...form, experienceVideos: next });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </form>
  );
};
