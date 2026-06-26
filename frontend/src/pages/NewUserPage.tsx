import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  UserCircleIcon,
  IdentificationIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../services/userService';
import BulkUploadUsers from '@/components/BulkUploadUsers';

// ── Reusable field wrapper ──────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';
const selectCls =
  'w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';

function InputWithIcon({
  icon: Icon,
  ...props
}: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input className={inputCls} {...props} />
    </div>
  );
}

const EMPTY_FORM = { firstName: '', lastName: '', dni: '', gender: '', birthdate: '', email: '', password: '' };

const NewUserPage: React.FC = () => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.dni || !formData.gender || !formData.birthdate) {
      setError('Por favor, complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const data = await userService.registerUser(formData);
      setMessage(data.msg || 'Usuario registrado correctamente.');
      setFormData(EMPTY_FORM);
    } catch (err: any) {
      setError(err.msg || 'Error al registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Nuevo Usuario
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Registra un usuario individual o carga múltiples usuarios desde un archivo.
          </p>
        </div>
        <Link
          to="/users"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </Link>
      </div>

      {/* ── Alerts ── */}
      {message && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Individual registration ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCircleIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Registro Individual</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombres *">
                <InputWithIcon
                  icon={UserCircleIcon}
                  name="firstName"
                  placeholder="Ej. María"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Apellidos *">
                <InputWithIcon
                  icon={UserCircleIcon}
                  name="lastName"
                  placeholder="Ej. González"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="DNI *">
                <InputWithIcon
                  icon={IdentificationIcon}
                  name="dni"
                  placeholder="12345678"
                  maxLength={8}
                  value={formData.dni}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Género *">
                <div className="relative">
                  <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className={selectCls}
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
              </Field>
              <Field label="Fecha de nacimiento *">
                <InputWithIcon
                  icon={CalendarDaysIcon}
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Correo electrónico (opcional)">
                <InputWithIcon
                  icon={EnvelopeIcon}
                  type="email"
                  name="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Field>
              <Field label="Contraseña (opcional)">
                <InputWithIcon
                  icon={LockClosedIcon}
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                style={{ background: '#538f65' }}
              >
                {loading ? 'Registrando...' : 'Registrar Usuario'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Bulk upload ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <CloudArrowUpIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Carga Masiva</h2>
          </div>
          <BulkUploadUsers />
        </div>
      </div>
    </div>
  );
};

export default NewUserPage;
