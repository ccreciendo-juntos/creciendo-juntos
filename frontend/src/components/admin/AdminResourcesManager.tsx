import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Share2,
  Users,
  Lock,
  Unlock,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react';
import { request } from '../../services/api';

export interface PedagogicalResource {
  id: string;
  title: string;
  description: string;
  category: 'Unidad de Aprendizaje' | 'Ficha de Aprendizaje' | 'Rúbrica de Evaluación' | 'Sesión de Aprendizaje' | 'Guía Metodológica' | 'Otro';
  file_type: 'pdf' | 'word' | 'ppt' | 'excel' | 'youtube' | 'link';
  file_url: string;
  file_name?: string | null;
  grade: number; // 0 = Todos los grados, 1..5 = 1° a 5° Sec
  area: string;
  share_mode: 'all_with_load' | 'specific' | 'private';
  shared_user_ids: string[];
  is_active: boolean;
  created_at?: string;
}

interface TeacherUserSimple {
  id: string;
  name: string;
  email: string;
  school_name?: string | null;
  specialty?: string | null;
}

export const AdminResourcesManager: React.FC = () => {
  const [resources, setResources] = useState<PedagogicalResource[]>([]);
  const [teachers, setTeachers] = useState<TeacherUserSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [banner, setBanner] = useState<string | null>(null);

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<PedagogicalResource | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    description: string;
    category: PedagogicalResource['category'];
    file_type: PedagogicalResource['file_type'];
    file_url: string;
    file_name: string;
    grade: number;
    share_mode: PedagogicalResource['share_mode'];
    shared_user_ids: string[];
    is_active: boolean;
  }>({
    title: '',
    description: '',
    category: 'Unidad de Aprendizaje',
    file_type: 'pdf',
    file_url: '',
    file_name: '',
    grade: 0,
    share_mode: 'all_with_load',
    shared_user_ids: [],
    is_active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, usersRes] = await Promise.all([
        request('/admin/resources'),
        request('/admin/users'),
      ]);
      if (resRes.success && Array.isArray(resRes.data)) {
        setResources(resRes.data);
      }
      if (usersRes.success && Array.isArray(usersRes.data)) {
        setTeachers(usersRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewModal = () => {
    setEditingResource(null);
    setForm({
      title: '',
      description: '',
      category: 'Unidad de Aprendizaje',
      file_type: 'pdf',
      file_url: '',
      file_name: '',
      grade: 0,
      share_mode: 'all_with_load',
      shared_user_ids: [],
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (r: PedagogicalResource) => {
    setEditingResource(r);
    setForm({
      title: r.title,
      description: r.description || '',
      category: r.category,
      file_type: r.file_type,
      file_url: r.file_url,
      file_name: r.file_name || '',
      grade: r.grade || 0,
      share_mode: r.share_mode || 'all_with_load',
      shared_user_ids: r.shared_user_ids || [],
      is_active: r.is_active !== false,
    });
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('El archivo excede 4MB. Para archivos más grandes, pegue el enlace de Google Drive o YouTube.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let detectedType: PedagogicalResource['file_type'] = form.file_type;
    if (ext === 'pdf') detectedType = 'pdf';
    else if (ext === 'doc' || ext === 'docx') detectedType = 'word';
    else if (ext === 'ppt' || ext === 'pptx') detectedType = 'ppt';
    else if (ext === 'xls' || ext === 'xlsx') detectedType = 'excel';

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        file_type: detectedType,
        file_url: String(reader.result || ''),
        file_name: file.name,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const toggleTeacherAccess = (teacherId: string) => {
    setForm((prev) => {
      const exists = prev.shared_user_ids.includes(teacherId);
      return {
        ...prev,
        shared_user_ids: exists
          ? prev.shared_user_ids.filter((id) => id !== teacherId)
          : [...prev.shared_user_ids, teacherId],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file_url.trim()) {
      alert('Debe subir un archivo o ingresar la URL del documento / video de YouTube.');
      return;
    }
    setSaving(true);
    try {
      const res = editingResource
        ? await request(`/admin/resources/${editingResource.id}`, 'PUT', form)
        : await request('/admin/resources', 'POST', form);
      if (res.success) {
        setShowModal(false);
        setBanner(editingResource ? 'Recurso actualizado y permisos sincronizados.' : 'Recurso publicado y compartido con los docentes.');
        setTimeout(() => setBanner(null), 4000);
        fetchData();
      } else {
        alert(res.error?.message || 'Error al guardar el recurso.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShareQuick = async (r: PedagogicalResource) => {
    const nextActive = !r.is_active;
    const res = await request(`/admin/resources/${r.id}`, 'PUT', { is_active: nextActive });
    if (res.success) {
      fetchData();
    }
  };

  const handleDelete = async (r: PedagogicalResource) => {
    if (!window.confirm(`¿Eliminar el recurso "${r.title}"?`)) return;
    const res = await request(`/admin/resources/${r.id}`, 'DELETE');
    if (res.success) fetchData();
  };

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, filterCategory, searchTerm]);

  const getFileBadge = (ft: string) => {
    switch (ft) {
      case 'pdf':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700">PDF</span>;
      case 'word':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700">WORD</span>;
      case 'ppt':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800">PPT</span>;
      case 'excel':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">EXCEL</span>;
      case 'youtube':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700">YOUTUBE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">ENLACE</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" /> Repositorio de Recursos Pedagógicos (Educación Religiosa)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sube y comparte Unidades de Aprendizaje, Fichas, Rúbricas, PDF, Word, PPT, Excel y Videos de YouTube con los docentes que tienen carga académica.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Subir / Compartir Recurso
        </button>
      </div>

      {banner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {banner}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar unidad, ficha, rúbrica o video..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none"
        >
          <option value="all">Todas las Categorías</option>
          <option value="Unidad de Aprendizaje">Unidades de Aprendizaje</option>
          <option value="Ficha de Aprendizaje">Fichas de Aprendizaje</option>
          <option value="Rúbrica de Evaluación">Rúbricas de Evaluación</option>
          <option value="Sesión de Aprendizaje">Sesiones de Aprendizaje</option>
          <option value="Guía Metodológica">Guías Metodológicas</option>
          <option value="Otro">Otros Documentos</option>
        </select>
      </div>

      {/* Resource Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Cargando recursos pedagógicos...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Aún no hay recursos pedagógicos publicados</p>
          <p className="text-xs text-slate-400">Haz clic en "+ Subir / Compartir Recurso" para proporcionar materiales a los docentes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-blue-300 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getFileBadge(r.file_type)}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                      {r.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {r.grade > 0 ? `${r.grade}° Sec` : '1° a 5° Sec'}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                {r.description && <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>}

                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-700">
                    {r.share_mode === 'all_with_load'
                      ? 'Docentes con carga académica'
                      : r.share_mode === 'specific'
                      ? `${r.shared_user_ids.length} docente(s) seleccionado(s)`
                      : 'Solo Administrador (Privado)'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleShareQuick(r)}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                    r.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {r.is_active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {r.is_active ? 'Acceso Activo' : 'Oculto'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(r)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    Compartir / Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Resource */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleSave}
            className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-slide-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                {editingResource ? 'Editar y Compartir Recurso' : 'Nuevo Documento / Video Pedagógico'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Título del Documento o Video</label>
                <input
                  type="text"
                  placeholder="Ej. Unidad de Aprendizaje N° 3 - Valores del Evangelio"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría Pedagógica</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Unidad de Aprendizaje">Unidad de Aprendizaje</option>
                  <option value="Ficha de Aprendizaje">Ficha de Aprendizaje</option>
                  <option value="Rúbrica de Evaluación">Rúbrica de Evaluación</option>
                  <option value="Sesión de Aprendizaje">Sesión de Aprendizaje</option>
                  <option value="Guía Metodológica">Guía Metodológica</option>
                  <option value="Otro">Otro Material</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grado de Secundaria</label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                >
                  <option value={0}>Todos los grados (1° a 5°)</option>
                  <option value={1}>1° de Secundaria</option>
                  <option value={2}>2° de Secundaria</option>
                  <option value={3}>3° de Secundaria</option>
                  <option value={4}>4° de Secundaria</option>
                  <option value={5}>5° de Secundaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Formato del Recurso</label>
                <select
                  value={form.file_type}
                  onChange={(e) => setForm({ ...form, file_type: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                >
                  <option value="pdf">Documento PDF (.pdf)</option>
                  <option value="word">Documento Word (.doc / .docx)</option>
                  <option value="ppt">Presentación PowerPoint (.ppt / .pptx)</option>
                  <option value="excel">Hoja de Cálculo Excel (.xls / .xlsx)</option>
                  <option value="youtube">Video de YouTube</option>
                  <option value="link">Enlace Web / Google Drive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subir Archivo desde PC (PDF, Word, PPT, Excel)</label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl cursor-pointer text-slate-700">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="truncate">{form.file_name || 'Seleccionar archivo...'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  O Pegar Enlace / URL (YouTube, Google Drive, PDF externo)
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... o https://drive.google.com/..."
                  value={form.file_url.startsWith('data:') ? `[Archivo cargado: ${form.file_name}]` : form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value, file_name: '' })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Orientaciones</label>
                <textarea
                  rows={2}
                  placeholder="Indicaciones breves para los docentes de Educación Religiosa..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Sharing Permissions */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Control de Acceso para Docentes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all_with_load', label: 'Docentes con Carga Académica', desc: 'Todos los docentes de Religión con secciones' },
                  { id: 'specific', label: 'Docentes Específicos', desc: 'Elegir manualmente quién accede' },
                  { id: 'private', label: 'Privado (Oculto)', desc: 'Solo visible para el Administrador' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, share_mode: opt.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      form.share_mode === opt.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-[11px] font-bold">{opt.label}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {form.share_mode === 'specific' && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Selecciona los docentes autorizados:</p>
                  {teachers.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay docentes registrados aún.</p>
                  ) : (
                    teachers.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-1 hover:bg-slate-50 px-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={form.shared_user_ids.includes(t.id)}
                          onChange={() => toggleTeacherAccess(t.id)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="font-bold">{t.name}</span>
                        <span className="text-[10px] text-slate-400">({t.school_name || t.email})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingResource ? 'Guardar Cambios' : 'Publicar y Compartir'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
