import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CalendarDateRangeIcon,
  IdentificationIcon,
  MapPinIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import DniCardPreview from '@/components/DniCardPreview';
import { dniEscolarService } from '@/services/dniEscolarService';
import { useInstitutionSettings } from '@/hooks/useInstitutionSettings';
import type { DniEscolar } from '@/types/dniEscolar';

const dniSchema = z.object({
  cui: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{6,15}$/, 'El CUI debe tener entre 6 y 15 caracteres alfanuméricos'),
  primerApellido: z.string().trim().min(1, 'El primer apellido es requerido'),
  segundoApellido: z.string().trim().optional(),
  preNombres: z.string().trim().min(1, 'Los pre-nombres son requeridos'),
  sexo: z.enum(['M', 'F']),
  fechaNacimiento: z.string().optional(),
  ubigeoNacimiento: z.string().optional(),

  fechaInscripcion: z.string().optional(),
  fechaEmision: z.string().optional(),
  fechaCaducidad: z.string().optional(),

  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
  donacionOrganos: z.enum(['Si', 'No']),

  anio: z.coerce.number().min(2000).max(2100),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof dniSchema>;

const inputCls =
  'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#eef6f0' }}
        >
          <Icon className="w-5 h-5" style={{ color: '#538f65' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: '#1a202c' }}>
            {title}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function toDateInput(value?: string): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** Redimensiona una imagen a máx 300×400 (JPEG ~0.75) antes de guardarla. */
async function resizePhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 300;
      const MAX_H = 400;
      const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const DEFAULTS_UBICACION = {
  departamento: 'AREQUIPA',
  provincia: 'ISLAY',
  distrito: 'DEAN VALDIVIA',
  direccion: 'I.E. FRANCISCO LOPEZ DE ROMAÑA (Prolongación Guardiola S/N La Curva)',
};

const EMPTY_VALUES: FormValues = {
  cui: '',
  primerApellido: '',
  segundoApellido: '',
  preNombres: '',
  sexo: 'M',
  fechaNacimiento: '',
  ubigeoNacimiento: '',
  fechaInscripcion: '',
  fechaEmision: '',
  fechaCaducidad: '',
  departamento: DEFAULTS_UBICACION.departamento,
  provincia: DEFAULTS_UBICACION.provincia,
  distrito: DEFAULTS_UBICACION.distrito,
  direccion: DEFAULTS_UBICACION.direccion,
  observaciones: '',
  donacionOrganos: 'No',
  anio: new Date().getFullYear(),
  notas: '',
};

export default function DniEscolarFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useInstitutionSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');

  // Carga del DNI a editar (react-query normal)
  const dniQuery = useQuery<DniEscolar>({
    queryKey: ['dni-escolar-item', id],
    queryFn: () => dniEscolarService.getById(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(dniSchema),
    defaultValues: EMPTY_VALUES,
  });

  const watched = watch();
  const previewDni: DniEscolar = {
    id: id ?? 'preview',
    cui: (watched.cui || '').toUpperCase(),
    primerApellido: watched.primerApellido || '',
    segundoApellido: watched.segundoApellido || '',
    preNombres: watched.preNombres || '',
    sexo: watched.sexo || 'M',
    fechaNacimiento: watched.fechaNacimiento
      ? new Date(`${watched.fechaNacimiento}T12:00:00`).toISOString()
      : undefined,
    ubigeoNacimiento: watched.ubigeoNacimiento,
    fechaInscripcion: watched.fechaInscripcion
      ? new Date(`${watched.fechaInscripcion}T12:00:00`).toISOString()
      : undefined,
    fechaEmision: watched.fechaEmision
      ? new Date(`${watched.fechaEmision}T12:00:00`).toISOString()
      : undefined,
    fechaCaducidad: watched.fechaCaducidad
      ? new Date(`${watched.fechaCaducidad}T12:00:00`).toISOString()
      : undefined,
    departamento: watched.departamento,
    provincia: watched.provincia,
    distrito: watched.distrito,
    direccion: watched.direccion,
    observaciones: watched.observaciones,
    donacionOrganos: watched.donacionOrganos || 'No',
    anio: watched.anio ?? new Date().getFullYear(),
    fotoBase64: fotoPreview,
    createdAt: '',
    updatedAt: '',
  };

  useEffect(() => {
    if (!dniQuery.data) return;
    const item = dniQuery.data;
    reset({
      cui: item.cui || '',
      primerApellido: item.primerApellido || '',
      segundoApellido: item.segundoApellido || '',
      preNombres: item.preNombres || '',
      sexo: item.sexo || 'M',
      fechaNacimiento: toDateInput(item.fechaNacimiento),
      ubigeoNacimiento: item.ubigeoNacimiento || '',
      fechaInscripcion: toDateInput(item.fechaInscripcion),
      fechaEmision: toDateInput(item.fechaEmision),
      fechaCaducidad: toDateInput(item.fechaCaducidad),
      departamento: item.departamento || '',
      provincia: item.provincia || '',
      distrito: item.distrito || '',
      direccion: item.direccion || '',
      observaciones: item.observaciones || '',
      donacionOrganos: item.donacionOrganos || 'No',
      anio: item.anio ?? new Date().getFullYear(),
      notas: item.notas || '',
    });
    setFotoBase64(item.fotoBase64 || '');
    setFotoPreview(item.fotoBase64 || '');
  }, [dniQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Partial<DniEscolar> = {
        ...values,
        fotoBase64,
        fechaNacimiento: values.fechaNacimiento || undefined,
        fechaInscripcion: values.fechaInscripcion || undefined,
        fechaEmision: values.fechaEmision || undefined,
        fechaCaducidad: values.fechaCaducidad || undefined,
      };
      return isEdit
        ? dniEscolarService.update(id!, payload)
        : dniEscolarService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dni-escolar'] });
      queryClient.invalidateQueries({ queryKey: ['dni-escolar-stats'] });
      toast.success(isEdit ? 'DNI actualizado' : 'DNI escolar registrado');
      navigate('/dni-escolar');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo guardar el DNI');
    },
  });

  const removeFotoMutation = useMutation({
    mutationFn: (targetId: string) =>
      dniEscolarService.update(targetId, { fotoBase64: '' }),
    onSuccess: () => {
      setFotoBase64('');
      setFotoPreview('');
      queryClient.invalidateQueries({ queryKey: ['dni-escolar'] });
      toast.success('Foto eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la foto'),
  });

  const handleFotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen (jpg, png, webp)');
      return;
    }
    const resized = await resizePhoto(file);
    setFotoBase64(resized);
    setFotoPreview(resized);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Foto lista para guardar');
  };

  if (isEdit && dniQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
      className="space-y-5 pb-12 max-w-4xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/dni-escolar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Volver a DNIs escolares
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {isEdit ? 'Editar DNI escolar' : 'Nuevo DNI escolar'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {isEdit
              ? 'Actualiza los datos impresos en la tarjeta.'
              : 'El CUI puede ser el DNI (8 dígitos) o el código de matrícula.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dni-escolar"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            style={{ background: '#538f65' }}
          >
            {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar DNI'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5">
          <Section
            icon={IdentificationIcon}
            title="Identificación del estudiante"
            description="Datos impresos en el anverso del DNI."
          >
            <Field label="CUI *" error={errors.cui?.message}>
              <input
                {...register('cui')}
                placeholder="Ej. 63420256 (DNI) o código de matrícula"
                className={`${inputCls} font-mono uppercase`}
              />
            </Field>

            <Field label="Pre Nombres *" error={errors.preNombres?.message}>
              <input {...register('preNombres')} placeholder="Ej. JOSTIN YOMAR" className={inputCls} />
            </Field>

            <Field label="Primer Apellido *" error={errors.primerApellido?.message}>
              <input {...register('primerApellido')} placeholder="Ej. LARICO" className={inputCls} />
            </Field>

            <Field label="Segundo Apellido" error={errors.segundoApellido?.message}>
              <input {...register('segundoApellido')} placeholder="Ej. MARIN" className={inputCls} />
            </Field>

            <Field label="Sexo" error={errors.sexo?.message}>
              <select {...register('sexo')} className={inputCls}>
                <option value="M">M (Masculino)</option>
                <option value="F">F (Femenino)</option>
              </select>
            </Field>

            <Field label="Fecha de nacimiento" error={errors.fechaNacimiento?.message}>
              <input type="date" {...register('fechaNacimiento')} className={inputCls} />
            </Field>

            <Field label="Ubigeo de nacimiento" error={errors.ubigeoNacimiento?.message}>
              <input {...register('ubigeoNacimiento')} placeholder="Ej. 040301" className={inputCls} />
            </Field>

            <Field label="Año" error={errors.anio?.message}>
              <input type="number" min={2000} max={2100} {...register('anio')} className={inputCls} />
            </Field>
          </Section>

          <Section
            icon={MapPinIcon}
            title="Ubicación y dirección (reverso)"
            description="Departamento, provincia, distrito y dirección de la I.E."
          >
            <Field label="Departamento" error={errors.departamento?.message}>
              <input {...register('departamento')} placeholder="Ej. AREQUIPA" className={inputCls} />
            </Field>
            <Field label="Provincia" error={errors.provincia?.message}>
              <input {...register('provincia')} placeholder="Ej. ISLAY" className={inputCls} />
            </Field>
            <Field label="Distrito" error={errors.distrito?.message}>
              <input {...register('distrito')} placeholder="Ej. DEAN VALDIVIA" className={inputCls} />
            </Field>
            <Field label="Dirección" error={errors.direccion?.message} className="sm:col-span-2">
              <input {...register('direccion')} className={inputCls} />
            </Field>
            <Field label="Observaciones" error={errors.observaciones?.message} className="sm:col-span-2">
              <input {...register('observaciones')} placeholder="Observaciones del reverso" className={inputCls} />
            </Field>
            <Field label="Donación de órganos" error={errors.donacionOrganos?.message}>
              <select {...register('donacionOrganos')} className={inputCls}>
                <option value="No">No</option>
                <option value="Si">Sí</option>
              </select>
            </Field>
          </Section>

          <Section
            icon={CalendarDateRangeIcon}
            title="Fechas del documento"
            description="Si dejas los campos vacíos se usan hoy / hoy / +3 años."
          >
            <Field label="Fecha de inscripción" error={errors.fechaInscripcion?.message}>
              <input type="date" {...register('fechaInscripcion')} className={inputCls} />
            </Field>
            <Field label="Fecha de emisión" error={errors.fechaEmision?.message}>
              <input type="date" {...register('fechaEmision')} className={inputCls} />
            </Field>
            <Field label="Fecha de caducidad" error={errors.fechaCaducidad?.message}>
              <input type="date" {...register('fechaCaducidad')} className={inputCls} />
            </Field>
            <Field label="Notas internas" error={errors.notas?.message}>
              <input {...register('notas')} placeholder="No se imprime en la tarjeta" className={inputCls} />
            </Field>
          </Section>
        </div>

        {/* Columna derecha: foto + vista previa */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Foto del estudiante
            </p>

            <div className="flex items-start gap-3">
              <div className="w-20 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto del estudiante" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <PhotoIcon className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </label>
                {isEdit && fotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Quitar la foto del DNI?')) {
                        removeFotoMutation.mutate(id!);
                      }
                    }}
                    className="block text-xs font-semibold text-red-600 hover:underline"
                  >
                    Eliminar foto
                  </button>
                )}
                <p className="text-[11px] text-gray-400 leading-snug">
                  Se redimensiona automáticamente a 300 × 400 px para no inflar la base de datos.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Vista previa de la tarjeta
            </p>
            <DniCardPreview dni={previewDni} settings={settings} />
          </div>
        </aside>
      </div>
    </form>
  );
}
