import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Globe, Sparkles, CheckCircle2, MessageSquare, LayoutTemplate } from 'lucide-react';
import { request } from '../../services/api';
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from './landingConfig';

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
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Sección Simulacros</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.simulacroTitle} onChange={(e) => setForm({ ...form, simulacroTitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Botón WhatsApp Flotante</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.whatsappLabel} onChange={(e) => setForm({ ...form, whatsappLabel: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título Pie de Página (Footer)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.footerBrandTitle} onChange={(e) => setForm({ ...form, footerBrandTitle: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Texto Derechos Reservados (Footer)</label>
            <input type="text" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl" value={form.footerCopyright} onChange={(e) => setForm({ ...form, footerCopyright: e.target.value })} />
          </div>
        </div>
      </div>
    </form>
  );
};
