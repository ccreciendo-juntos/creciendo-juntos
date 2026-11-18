import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  X
} from 'lucide-react';
import type { StudentRecord } from './types';

interface VeloxStudentsProps {
  students: StudentRecord[];
  onAddStudent: (st: StudentRecord) => void;
  onUpdateStudent: (st: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  selectedGrade: number;
  selectedSection: string;
}

export const VeloxStudents: React.FC<VeloxStudentsProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  selectedGrade,
  selectedSection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

  // Form state
  const [formDni, setFormDni] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = s.grade === selectedGrade && s.section === selectedSection;
      if (!matchClass) return false;

      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.dni.includes(q);
    });
  }, [students, selectedGrade, selectedSection, statusFilter, searchQuery]);

  // Open add modal
  const openAddModal = () => {
    setFormDni('');
    setFormName('');
    setFormPhone('');
    setEditingStudent(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (st: StudentRecord) => {
    setEditingStudent(st);
    setFormDni(st.dni);
    setFormName(st.fullName);
    setFormPhone(st.parentPhone || '');
    setShowAddModal(true);
  };

  // Submit modal form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDni.trim()) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        dni: formDni.trim(),
        fullName: formName.trim().toUpperCase(),
        parentPhone: formPhone.trim()
      });
    } else {
      const newSt: StudentRecord = {
        id: `est_${Date.now()}`,
        dni: formDni.trim(),
        fullName: formName.trim().toUpperCase(),
        grade: selectedGrade,
        section: selectedSection,
        parentPhone: formPhone.trim(),
        status: 'active'
      };
      onAddStudent(newSt);
    }
    setShowAddModal(false);
  };

  // Download Excel template
  const downloadTemplate = () => {
    let csv = `DNI\tNOMBRE COMPLETO\tTELEFONO APODERADO\n`;
    csv += `62712374\tAPONTE FLORES, JOAQUIN SEBASTHIAN\t984512301\n`;
    csv += `1205805020\tARANGO CACERES, ARACELY PRISSILA\t976541230\n`;

    const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plantilla_Estudiantes_${selectedGrade}${selectedSection}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estudiantes</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Gestiona la información de tus alumnos de Educación Religiosa de manera eficiente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" /> Plantilla
          </button>

          <button 
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Alumno
          </button>
        </div>
      </div>

      {/* Filter Ribbon (Exact mirror of Velox reference - Image 3) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control text-xs pl-9 py-2.5 rounded-xl border border-slate-300 w-full focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="form-control text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-center">
            {selectedGrade}to {selectedSection}
          </div>
        </div>

        <div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="form-control text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-300 w-full bg-white focus:ring-2 focus:ring-blue-500 text-center"
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-300">
                <th className="p-4">NOMBRE COMPLETO</th>
                <th className="p-4 text-center">GRADO</th>
                <th className="p-4">DNI</th>
                <th className="p-4">TELÉFONO</th>
                <th className="p-4 text-center">ESTADO</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron estudiantes para este grado y sección.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-800 uppercase">
                      {st.fullName}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600">
                      {st.grade}to {st.section}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-600">
                      {st.dni}
                    </td>
                    <td className="p-4 text-slate-500">
                      {st.parentPhone || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Activo
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar al estudiante ${st.fullName}?`)) {
                              onDeleteStudent(st.id);
                            }
                          }}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-slide-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-black text-slate-900">
                {editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DNI del Alumno</label>
                <input 
                  type="text"
                  required
                  maxLength={12}
                  value={formDni}
                  onChange={e => setFormDni(e.target.value)}
                  className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. 62712374"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Apellidos y Nombres</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ej. APONTE FLORES, JOAQUIN"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono del Apoderado (Opcional)</label>
                <input 
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="form-control text-xs w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. 984512301"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  {editingStudent ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
