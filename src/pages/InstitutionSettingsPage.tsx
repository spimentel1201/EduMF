import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  PhotoIcon,
  XMarkIcon,
  Cog8ToothIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useInstitutionSettings, useUpdateInstitutionSettings } from '@/hooks/useInstitutionSettings';
import type { InstitutionSettings } from '@/types/institution';

// ── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1, 'El nombre es requerido').trim(),
  address:     z.string().optional().default(''),
  phone:       z.string().optional().default(''),
  email:       z.union([z.string().email('Correo inválido'), z.literal('')]).optional().default(''),
  logoBase64:  z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

// ── LogoUploader ─────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_MB   = 2;

interface LogoUploaderProps {
  value?: string;
  onChange: (base64: string) => void;
  onClear: () => void;
}

function LogoUploader({ value, onChange, onClear }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten archivos PNG, JPEG o WEBP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo no debe superar ${MAX_SIZE_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {value ? (
        /* Preview */
        <div className="relative inline-block">
          <img
            src={value}
            alt="Logo institucional"
            className="h-24 w-auto max-w-[200px] object-contain rounded-xl border border-gray-200 bg-gray-50 p-2"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
        >
          <PhotoIcon className="w-8 h-8 text-gray-300" />
          <span className="text-sm text-gray-500 text-center px-4">
            Haz clic o arrastra el logo <span className="font-semibold">PNG, JPEG o WEBP</span> (máx. {MAX_SIZE_MB} MB)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
        >
          Cambiar logo
        </button>
      )}
      {/* Hidden input for "change" action when preview is shown */}
      {value && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          className="hidden"
        />
      )}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
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

function InputWithIcon({ icon: Icon, ...props }: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input className={inputCls} {...props} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InstitutionSettingsPage() {
  const { data: settings, isLoading } = useInstitutionSettings();
  const updateMutation = useUpdateInstitutionSettings();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', phone: '', email: '', logoBase64: '' },
    shouldUseNativeValidation: false,
  });

  const logoBase64 = watch('logoBase64');

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      reset({
        name:       settings.name       ?? '',
        address:    settings.address    ?? '',
        phone:      settings.phone      ?? '',
        email:      settings.email      ?? '',
        logoBase64: settings.logoBase64 ?? '',
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: FormData) => {
    const payload: InstitutionSettings = {
      name:       data.name,
      address:    data.address    ?? '',
      phone:      data.phone      ?? '',
      email:      data.email      ?? '',
      logoBase64: data.logoBase64 ?? '',
    };

    updateMutation.mutate(payload, {
      onSuccess: () => toast.success('Configuración guardada correctamente'),
      onError:   (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar la configuración'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
          Configuración Institucional
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
          Datos de identidad de la institución. Aparecerán en reportes PDF, plantillas Excel y documentos exportados.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Logo ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <PhotoIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Logo Institucional</h2>
          </div>
          <LogoUploader
            value={logoBase64 || undefined}
            onChange={(b64) => setValue('logoBase64', b64, { shouldDirty: true })}
            onClear={() => setValue('logoBase64', '', { shouldDirty: true })}
          />
        </div>

        {/* ── Datos institucionales ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <BuildingOfficeIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Datos de la Institución</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre de la institución *" error={errors.name?.message}>
              <InputWithIcon
                icon={BuildingOfficeIcon}
                placeholder="Ej. I.E. San Martín de Porres"
                {...register('name')}
              />
            </Field>
            <Field label="Correo electrónico" error={errors.email?.message}>
              <InputWithIcon
                icon={EnvelopeIcon}
                type="email"
                placeholder="contacto@institucion.edu.pe"
                {...register('email')}
              />
            </Field>
            <Field label="Teléfono" error={errors.phone?.message}>
              <InputWithIcon
                icon={PhoneIcon}
                placeholder="01-234-5678"
                {...register('phone')}
              />
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              <InputWithIcon
                icon={MapPinIcon}
                placeholder="Av. Principal 123, Lima"
                {...register('address')}
              />
            </Field>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => settings && reset({
              name:       settings.name       ?? '',
              address:    settings.address    ?? '',
              phone:      settings.phone      ?? '',
              email:      settings.email      ?? '',
              logoBase64: settings.logoBase64 ?? '',
            })}
            disabled={!isDirty}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-40"
          >
            Descartar cambios
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || !isDirty}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
            style={{ background: '#538f65' }}
          >
            <Cog8ToothIcon className="w-4 h-4" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
