import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  Search,
  ShieldCheck,
  Lock,
  X,
  ExternalLink,
} from 'lucide-react';
import { request } from '../../services/api';
import type { PedagogicalResource } from '../admin/AdminResourcesManager';

function getYoutubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export const TeacherResourcesViewer: React.FC = () => {
  const [resources, setResources] = useState<PedagogicalResource[]>([]);
  const [hasAcademicLoad, setHasAcademicLoad] = useState<boolean>(true);
  const [assignedSections, setAssignedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState<number>(-1);
  const [previewResource, setPreviewResource] = useState<PedagogicalResource | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const res = await request('/teacher/resources');
        if (res.success && res.data) {
          setHasAcademicLoad(Boolean(res.data.hasAcademicLoad));
          setAssignedSections(res.data.assignedSections || []);
          setResources(res.data.resources || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedGrade !== -1 && r.grade !== 0 && r.grade !== selectedGrade) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, selectedCategory, selectedGrade, searchTerm]);

  const handleDownload = (r: PedagogicalResource) => {
    const a = document.createElement('a');
    a.href = r.file_url;
    a.download = r.file_name || `${r.title.replace(/ /g, '_')}.${r.file_type === 'word' ? 'docx' : r.file_type === 'ppt' ? 'pptx' : r.file_type === 'excel' ? 'xlsx' : 'pdf'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-700 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            {hasAcademicLoad ? 'Carga Académica Verificada • Educación Religiosa' : 'Sin Carga Académica Asignada'}
          </span>
          <h2 className="text-xl md:text-2xl font-black mt-1.5">Biblioteca Pedagógica de Educación Religiosa</h2>
          <p className="text-xs text-blue-100 mt-1">
            Unidades de aprendizaje, fichas, rúbricas, documentos Word/PPT/Excel/PDF y videos compartidos por Administración.
          </p>
        </div>

        {assignedSections.length > 0 && (
          <div className="flex flex-wrap gap-1.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
            {assignedSections.map((s, i) => (
              <span key={i} className="text-[10px] font-bold bg-white text-blue-900 px-2 py-0.5 rounded-md">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar unidad, ficha, rúbrica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none"
        >
          <option value="all">Todas las Categorías</option>
          <option value="Unidad de Aprendizaje">Unidades de Aprendizaje</option>
          <option value="Ficha de Aprendizaje">Fichas de Aprendizaje</option>
          <option value="Rúbrica de Evaluación">Rúbricas de Evaluación</option>
          <option value="Sesión de Aprendizaje">Sesiones de Aprendizaje</option>
          <option value="Guía Metodológica">Guías Metodológicas</option>
        </select>

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(Number(e.target.value))}
          className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none"
        >
          <option value={-1}>Todos los Grados</option>
          <option value={1}>1° de Secundaria</option>
          <option value={2}>2° de Secundaria</option>
          <option value={3}>3° de Secundaria</option>
          <option value={4}>4° de Secundaria</option>
          <option value={5}>5° de Secundaria</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-semibold">Cargando documentos compartidos...</div>
      ) : !hasAcademicLoad && resources.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-2">
          <Lock className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-black text-amber-900">Acceso restringido a docentes con carga académica</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            El Administrador debe asignarte carga académica (secciones de Educación Religiosa) o compartirte documentos específicamente para poder visualizarlos aquí.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No hay documentos disponibles en esta categoría</p>
          <p className="text-xs text-slate-400">Cuando el Administrador comparta unidades, fichas o rúbricas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                    {r.file_type.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {r.grade > 0 ? `${r.grade}° Sec` : '1° a 5° Sec'}
                  </span>
                </div>
                <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {r.category}
                </span>
                <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                {r.description && <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewResource(r)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Visualizar
                </button>
                {r.file_type !== 'youtube' && (
                  <button
                    type="button"
                    onClick={() => handleDownload(r)}
                    className="inline-flex items-center justify-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl cursor-pointer"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integrated Multimedia Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-300">{previewResource.category} • {previewResource.file_type.toUpperCase()}</span>
                <h3 className="text-base font-bold">{previewResource.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {previewResource.file_type !== 'youtube' && (
                  <button
                    type="button"
                    onClick={() => handleDownload(previewResource)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                )}
                <button type="button" onClick={() => setPreviewResource(null)} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center min-h-[450px]">
              {previewResource.file_type === 'youtube' ? (
                <iframe
                  className="w-full aspect-video max-h-[540px] rounded-xl shadow-md"
                  src={getYoutubeEmbedUrl(previewResource.file_url) || previewResource.file_url}
                  title={previewResource.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewResource.file_type === 'pdf' ? (
                <iframe
                  src={previewResource.file_url}
                  className="w-full h-[560px] rounded-xl bg-white border-none"
                  title={previewResource.title}
                />
              ) : (previewResource.file_type === 'word' || previewResource.file_type === 'ppt' || previewResource.file_type === 'excel') &&
                previewResource.file_url.startsWith('http') ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewResource.file_url)}`}
                  className="w-full h-[560px] rounded-xl bg-white border-none"
                  title={previewResource.title}
                />
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-md">
                  <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                  <h4 className="font-bold text-slate-900">{previewResource.file_name || previewResource.title}</h4>
                  <p className="text-xs text-slate-500">
                    Este documento ({previewResource.file_type.toUpperCase()}) está listo para descargar o abrir en tu equipo.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(previewResource)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Descargar Documento
                    </button>
                    {previewResource.file_url.startsWith('http') && (
                      <a
                        href={previewResource.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl"
                      >
                        <ExternalLink className="w-4 h-4" /> Abrir Enlace
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
