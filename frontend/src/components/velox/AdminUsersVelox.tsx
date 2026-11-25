import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Shield,
  Pencil,
  Trash2,
  Building2,
  GraduationCap,
  BookOpen,
  UserCheck,
  Eye,
  EyeOff,
  X,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { request } from '../../services/api';

interface SchoolItem {
  id: string;
  name: string;
  ruc?: string;
  address?: string;
  contact_email?: string;
  status?: string;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  dni?: string;
  phone?: string;
  role: string;
  school_id?: string | null;
  school_name?: string | null;
  specialty?: string | null;
  status?: string;
}

const GRADE_SECTIONS = [
  '1ro A', '1ro B', '1ro C', '1ro D',
  '2do A', '2do B', '2do C', '2do D', '2do E',
  '3ro A', '3ro B', '3ro C', '3ro D',
  '4to A', '4to B', '4to C', '4to D',
  '5to A', '5to B', '5to C', '5to D',
];

export const AdminUsersVelox: React.FC = () => {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: Create/Edit User (Matching Image 5)
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '',
    dni: '',
    email: '',
    password: '',
    role: 'docente' as 'subdirector' | 'docente' | 'auxiliar',
    isCoordinator: false,
    school_id: '',
    area: 'Educación Religiosa',
    pendingSection: '1ro B',
    assignedSections: [] as string[],
  });

  // Modal: Create Institution
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    ruc: '',
    address: '',
    contact_email: '',
  });
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const fetchSchools = async () => {
    const res = await request('/admin/schools');
    if (res.success && Array.isArray(res.data)) {
      setSchools(res.data);
      if (res.data.length > 0 && !userForm.school_id) {
        setUserForm((prev) => ({ ...prev, school_id: res.data[0].id }));
      }
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const qs = selectedSchoolId !== 'all' ? `?schoolId=${encodeURIComponent(selectedSchoolId)}` : '';
      const res = await request(`/admin/users${qs}`);
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [selectedSchoolId]);

  const parseSpecialty = (raw?: string | null): { isCoordinator: boolean; sections: string[] } => {
    if (!raw) return { isCoordinator: false, sections: [] };
    try {
      const parsed = JSON.parse(raw);
      return {
        isCoordinator: Boolean(parsed.isCoordinator),
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      };
    } catch {
      return { isCoordinator: false, sections: raw ? [raw] : [] };
    }
  };

  const openNewUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      dni: '',
      email: '',
      password: '',
      role: 'docente',
      isCoordinator: false,
      school_id: selectedSchoolId !== 'all' ? selectedSchoolId : schools[0]?.id || '',
      area: 'Educación Religiosa',
      pendingSection: '1ro B',
      assignedSections: [],
    });
    setShowPassword(false);
    setShowUserModal(true);
  };

  const openEditUserModal = (u: AdminUserItem) => {
    const meta = parseSpecialty(u.specialty);
    setEditingUser(u);
    setUserForm({
      name: u.name,
      dni: u.dni || '',
      email: u.email,
      password: '',
      role: (u.role === 'subdirector' || u.role === 'auxiliar' ? u.role : 'docente'),
      isCoordinator: meta.isCoordinator,
      school_id: u.school_id || schools[0]?.id || '',
      area: 'Educación Religiosa',
      pendingSection: '1ro B',
      assignedSections: meta.sections,
    });
    setShowPassword(false);
    setShowUserModal(true);
  };

  const handleAddAssignedSection = () => {
    const label = `${userForm.area} - ${userForm.pendingSection}`;
    if (!userForm.assignedSections.includes(label)) {
      setUserForm((prev) => ({
        ...prev,
        assignedSections: [...prev.assignedSections, label],
      }));
    }
  };

  const handleRemoveAssignedSection = (sec: string) => {
    setUserForm((prev) => ({
      ...prev,
      assignedSections: prev.assignedSections.filter((s) => s !== sec),
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.school_id) {
      alert('Por favor seleccione o cree una Institución Educativa primero.');
      return;
    }
    setSavingUser(true);
    try {
      const specialtyJson = JSON.stringify({
        area: userForm.area,
        isCoordinator: userForm.isCoordinator,
        sections: userForm.assignedSections,
      });

      const payload: any = {
        name: userForm.name.trim(),
        dni: userForm.dni.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        school_id: userForm.school_id,
        specialty: specialtyJson,
      };
      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      const res = editingUser
        ? await request(`/admin/users/${editingUser.id}`, 'PUT', payload)
        : await request('/admin/users', 'POST', payload);

      if (res.success) {
        setShowUserModal(false);
        setStatusBanner(editingUser ? 'Usuario actualizado correctamente.' : `Docente "${userForm.name}" creado e integrado a su institución.`);
        setTimeout(() => setStatusBanner(null), 4000);
        fetchUsers();
      } else {
        alert(res.error?.message || 'Error al guardar usuario.');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${u.name}?`)) return;
    const res = await request(`/admin/users/${u.id}`, 'DELETE');
    if (res.success) {
      fetchUsers();
    } else {
      alert(res.error?.message || 'No se pudo eliminar el usuario.');
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchool(true);
    try {
      const res = await request('/admin/schools', 'POST', schoolForm);
      if (res.success && res.data) {
        setShowSchoolModal(false);
        setSchoolForm({ name: '', ruc: '', address: '', contact_email: '' });
        await fetchSchools();
        setSelectedSchoolId(res.data.id);
        setUserForm((prev) => ({ ...prev, school_id: res.data.id }));
        setStatusBanner(`Institución "${res.data.name}" creada correctamente.`);
        setTimeout(() => setStatusBanner(null), 4000);
      } else {
        alert(res.error?.message || 'Error al crear la institución.');
      }
    } finally {
      setSavingSchool(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.dni && u.dni.toLowerCase().includes(q)) ||
        (u.school_name && u.school_name.toLowerCase().includes(q))
    );
  }, [users, searchTerm]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'subdirector':
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">SUBDIRECTOR(A)</span>;
      case 'auxiliar':
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">AUXILIAR</span>;
      default:
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">DOCENTE</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header (Matching Image 6) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Gestión de Usuarios</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra el personal docente de cada institución educativa de forma independiente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSchoolModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-600" /> + Nueva Institución
          </button>

          <button
            type="button"
            onClick={openNewUserModal}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {statusBanner}
        </div>
      )}

      {/* Institution Filter + Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full py-2.5 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Instituciones ({schools.length})</option>
            {schools.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Cards Grid (Matching Image 6) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-semibold">Cargando personal docente...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No hay usuarios docentes registrados para esta institución</p>
          <p className="text-xs text-slate-400">Haz clic en "+ Nuevo Usuario" para crear una cuenta docente independiente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const meta = parseSpecialty(u.specialty);
            return (
              <div
                key={u.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-sm shrink-0 border border-slate-200">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{u.name}</h4>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {getRoleBadge(u.role)}
                          {meta.isCoordinator && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              COORDINADOR(A)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditUserModal(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{u.school_name || 'Sin Institución'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>DNI: {u.dni || 'No registrado'}</span>
                    </div>
                  </div>

                  {meta.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {meta.sections.map((sec, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                          {sec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Nuevo / Editar Usuario (Exact Mirror of Image 5) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleSaveUser}
            className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-slide-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Institución Educativa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institución Educativa</label>
              <select
                value={userForm.school_id}
                onChange={(e) => setUserForm({ ...userForm, school_id: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Seleccione institución...</option>
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre Completo & DNI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DNI</label>
                <input
                  type="text"
                  placeholder="12345678"
                  value={userForm.dni}
                  onChange={(e) => setUserForm({ ...userForm, dni: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Correo Electrónico & Contraseña */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="docente@colegio.edu.pe"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-blue-50/40 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña {editingUser && <span className="text-[10px] font-normal text-slate-400">(opcional)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-blue-50/40 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Rol de Usuario (3 cards matching Image 5) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Rol de Usuario</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'subdirector', label: 'Subdirector(A)', icon: GraduationCap },
                  { id: 'docente', label: 'Docente', icon: BookOpen },
                  { id: 'auxiliar', label: 'Auxiliar De Ed...', icon: UserCheck },
                ].map((r) => {
                  const Icon = r.icon;
                  const active = userForm.role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setUserForm({ ...userForm, role: r.id as any })}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'border-blue-500 bg-blue-50/60 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-bold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coordinator Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={userForm.isCoordinator}
                onChange={(e) => setUserForm({ ...userForm, isCoordinator: e.target.checked })}
                className="w-4 h-4 rounded border-amber-300 text-amber-600"
              />
              <span className="text-xs font-semibold text-amber-900">
                Asignar también funciones de Coordinador(a) a este Docente
              </span>
            </label>

            {/* Asignación Académica */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Asignación Académica
                </h4>
                <p className="text-[11px] text-slate-500">Selecciona los cursos y secciones que este docente enseñará.</p>
              </div>

              <div className="flex gap-2">
                <select
                  value={userForm.area}
                  onChange={(e) => setUserForm({ ...userForm, area: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl"
                >
                  <option value="Educación Religiosa">Educación Religiosa</option>
                </select>

                <select
                  value={userForm.pendingSection}
                  onChange={(e) => setUserForm({ ...userForm, pendingSection: e.target.value })}
                  className="w-28 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl"
                >
                  {GRADE_SECTIONS.map((gs) => (
                    <option key={gs} value={gs}>
                      {gs}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddAssignedSection}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="min-h-[42px] rounded-xl border border-dashed border-slate-200 bg-white p-2 flex flex-wrap gap-1.5 items-center justify-center">
                {userForm.assignedSections.length === 0 ? (
                  <span className="text-[11px] text-slate-400">No hay cursos asignados</span>
                ) : (
                  userForm.assignedSections.map((sec) => (
                    <span
                      key={sec}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200"
                    >
                      {sec}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignedSection(sec)}
                        className="text-blue-500 hover:text-rose-600 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {savingUser ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Nueva Institución Educativa */}
      {showSchoolModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleCreateSchool}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-slide-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">Nueva Institución Educativa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSchoolModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la I.E.</label>
              <input
                type="text"
                placeholder="Ej. I.E. 7053 Reino de España"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RUC / Código Modular</label>
                <input
                  type="text"
                  placeholder="20123456789"
                  value={schoolForm.ruc}
                  onChange={(e) => setSchoolForm({ ...schoolForm, ruc: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Institucional</label>
                <input
                  type="email"
                  placeholder="contacto@colegio.edu.pe"
                  value={schoolForm.contact_email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, contact_email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Av. Principal 123, Lima"
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSchoolModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingSchool}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {savingSchool ? 'Guardando...' : 'Crear Institución'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
