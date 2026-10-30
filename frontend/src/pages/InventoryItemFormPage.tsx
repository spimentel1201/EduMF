import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { inventoryService } from '@/services/inventoryService';
import type { InventoryItem } from '@/types/inventory';

const ESTADOS = [
  { value: '', label: 'Sin estado' },
  { value: 'B', label: 'Bueno (B)' },
  { value: 'R', label: 'Regular (R)' },
  { value: 'N', label: 'Nuevo (N)' },
];

const UNIDADES = ['UND', 'UNID.', 'LIBRO', 'CAJA', 'PAR', 'JUEGO', 'M2', 'KG'];

const itemSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del bien es requerido'),
  codigoSBNGeneral: z.string().optional(),
  codigoSBNCorrelativo: z.string().optional(),

  marca: z.string().optional(),
  tipo: z.string().optional(),
  modelo: z.string().optional(),
  serieDimensiones: z.string().optional(),
  color: z.string().optional(),
  otros: z.string().optional(),

  cantidad: z.coerce.number().min(0, 'La cantidad no puede ser negativa'),
  unidadMedida: z.string().min(1, 'Selecciona una unidad'),

  ambiente: z.string().optional(),
  ubicacion: z.string().optional(),

  estado: z.enum(['', 'B', 'R', 'N']),
  condicion: z.string().optional(),
  tipoBien: z.enum(['activo_fijo', 'bien_menor']),

  fechaIngreso: z.string().optional(),
  entidadDependencia: z.string().optional(),
  documentoSustentatorio: z.string().optional(),
  fechaDocumento: z.string().optional(),

  valorUnitario: z.coerce.number().min(0, 'El valor no puede ser negativo'),
  valorTotal: z.coerce.number().min(0, 'El valor no puede ser negativo'),

  anioInventario: z.coerce.number().min(2000).max(2100),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

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

const EMPTY_VALUES: FormValues = {
  nombre: '',
  codigoSBNGeneral: '',
  codigoSBNCorrelativo: '',
  marca: '',
  tipo: '',
  modelo: '',
  serieDimensiones: '',
  color: '',
  otros: '',
  cantidad: 1,
  unidadMedida: 'UND',
  ambiente: '',
  ubicacion: '',
  estado: '',
  condicion: '',
  tipoBien: 'activo_fijo',
  fechaIngreso: '',
  entidadDependencia: '',
  documentoSustentatorio: '',
  fechaDocumento: '',
  valorUnitario: 0,
  valorTotal: 0,
  anioInventario: new Date().getFullYear(),
  notas: '',
};

export default function InventoryItemFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdAmbiente, setCreatedAmbiente] = useState('');

  const { data: item, isLoading: isLoadingItem } = useQuery<InventoryItem>({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryService.getById(id!),
    enabled: isEdit,
  });

  const { data: ambientes = [] } = useQuery({
    queryKey: ['inventory-ambientes'],
    queryFn: inventoryService.getAmbientes,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: EMPTY_VALUES,
  });

  const cantidad = watch('cantidad');
  const valorUnitario = watch('valorUnitario');
  const valorTotal = watch('valorTotal');

  useEffect(() => {
    if (!item) return;
    reset({
      nombre: item.nombre || '',
      codigoSBNGeneral: item.codigoSBNGeneral || '',
      codigoSBNCorrelativo: item.codigoSBNCorrelativo || '',
      marca: item.marca || '',
      tipo: item.tipo || '',
      modelo: item.modelo || '',
      serieDimensiones: item.serieDimensiones || '',
      color: item.color || '',
      otros: item.otros || '',
      cantidad: item.cantidad ?? 1,
      unidadMedida: item.unidadMedida || 'UND',
      ambiente:
        item.ambiente && typeof item.ambiente === 'object'
          ? item.ambiente.id
          : (item.ambiente as string) || '',
      ubicacion: item.ubicacion || '',
      estado: (item.estado as FormValues['estado']) || '',
      condicion: item.condicion || '',
      tipoBien: item.tipoBien || 'activo_fijo',
      fechaIngreso: toDateInput(item.fechaIngreso),
      entidadDependencia: item.entidadDependencia || '',
      documentoSustentatorio: item.documentoSustentatorio || '',
      fechaDocumento: toDateInput(item.fechaDocumento),
      valorUnitario: item.valorUnitario ?? 0,
      valorTotal: item.valorTotal ?? 0,
      anioInventario: item.anioInventario ?? new Date().getFullYear(),
      notas: item.notas || '',
    });
  }, [item, reset]);

  const createAmbienteMutation = useMutation({
    mutationFn: (nombre: string) => inventoryService.createAmbiente(nombre),
    onSuccess: (ambiente) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-ambientes'] });
      setValue('ambiente', ambiente.id);
      setCreatedAmbiente(ambiente.nombre);
      toast.success(`Ambiente "${ambiente.nombre}" creado`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo crear el ambiente');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Partial<InventoryItem> = {
        ...values,
        fechaIngreso: values.fechaIngreso || undefined,
        fechaDocumento: values.fechaDocumento || undefined,
        ambiente: values.ambiente || undefined,
        valorTotal:
          Number(values.valorTotal) > 0
            ? Number(values.valorTotal)
            : Number(values.cantidad) * Number(values.valorUnitario),
      };
      return isEdit
        ? inventoryService.update(id!, payload)
        : inventoryService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ambientes'] });
      toast.success(isEdit ? 'Bien actualizado' : 'Bien registrado en el inventario');
      navigate('/inventory');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          (isEdit ? 'No se pudo actualizar el bien' : 'No se pudo registrar el bien')
      );
    },
  });

  const handleCreateAmbiente = () => {
    const nombre = window.prompt('Nombre del nuevo ambiente (ej. AULA 3B):');
    if (!nombre?.trim()) return;
    createAmbienteMutation.mutate(nombre.trim());
  };

  if (isEdit && isLoadingItem) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
      className="space-y-5 pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Volver al inventario
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            {isEdit ? 'Editar bien' : 'Nuevo bien'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            {isEdit
              ? `Código interno: ${item?.codigoInterno ?? '—'}`
              : 'El código interno se genera automáticamente al guardar.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/inventory"
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
            {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar bien'}
          </button>
        </div>
      </div>

      <Section
        icon={ArchiveBoxIcon}
        title="Identificación del bien"
        description="Descripción, marca, modelo y dimensiones del Anexo 03-A."
      >
        <Field label="Nombre del bien *" error={errors.nombre?.message} className="sm:col-span-2">
          <input
            {...register('nombre')}
            placeholder="Ej. AMPLIFICADOR DE AUDIO"
            className={inputCls}
          />
        </Field>

        <Field label="Marca" error={errors.marca?.message}>
          <input {...register('marca')} placeholder="Ej. PHONIC" className={inputCls} />
        </Field>
        <Field label="Modelo" error={errors.modelo?.message}>
          <input {...register('modelo')} placeholder="Ej. POWEREPOD1082R" className={inputCls} />
        </Field>
        <Field label="Tipo" error={errors.tipo?.message}>
          <input {...register('tipo')} placeholder="Ej. POLIPROPILENO" className={inputCls} />
        </Field>
        <Field label="Serie / dimensiones" error={errors.serieDimensiones?.message}>
          <input
            {...register('serieDimensiones')}
            placeholder="Ej. 50x69x74"
            className={inputCls}
          />
        </Field>
        <Field label="Color" error={errors.color?.message}>
          <input {...register('color')} placeholder="Ej. NEGRO" className={inputCls} />
        </Field>
        <Field label="Otros" error={errors.otros?.message}>
          <input {...register('otros')} placeholder="Observaciones del bien" className={inputCls} />
        </Field>
      </Section>

      <Section
        icon={BuildingOffice2Icon}
        title="Ubicación y estado"
        description="Ambiente, cantidad y estado de conservación."
      >
        <Field label="Ambiente" error={errors.ambiente?.message}>
          <div className="flex gap-2">
            <select {...register('ambiente')} className={inputCls}>
              <option value="">Sin ambiente</option>
              {ambientes.map((ambiente) => (
                <option key={ambiente.id} value={ambiente.id}>
                  {ambiente.nombre}
                </option>
              ))}
              {createdAmbiente &&
                !ambientes.some((a) => a.nombre === createdAmbiente) && (
                  <option value="">{createdAmbiente}</option>
                )}
            </select>
            <button
              type="button"
              onClick={handleCreateAmbiente}
              className="px-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              title="Crear ambiente"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </Field>

        <Field label="Ubicación (detalle)" error={errors.ubicacion?.message}>
          <input
            {...register('ubicacion')}
            placeholder="Ej. AUDITORIO"
            className={inputCls}
          />
        </Field>

        <Field label="Cantidad" error={errors.cantidad?.message}>
          <input
            type="number"
            min={0}
            step="1"
            {...register('cantidad')}
            className={inputCls}
          />
        </Field>

        <Field label="Unidad de medida" error={errors.unidadMedida?.message}>
          <select {...register('unidadMedida')} className={inputCls}>
            {UNIDADES.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estado de conservación" error={errors.estado?.message}>
          <select {...register('estado')} className={inputCls}>
            {ESTADOS.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Condición" error={errors.condicion?.message}>
          <input {...register('condicion')} placeholder="Ej. D (Designado)" className={inputCls} />
        </Field>

        <Field label="Tipo de bien" error={errors.tipoBien?.message}>
          <select {...register('tipoBien')} className={inputCls}>
            <option value="activo_fijo">Activo fijo</option>
            <option value="bien_menor">Bien menor</option>
          </select>
        </Field>

        <Field label="Año de inventario" error={errors.anioInventario?.message}>
          <input
            type="number"
            min={2000}
            max={2100}
            {...register('anioInventario')}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section
        icon={ClipboardDocumentListIcon}
        title="Códigos y procedencia"
        description="Código SBN, documento sustentatorio y fecha de adquisición."
      >
        <Field label="Código SBN general" error={errors.codigoSBNGeneral?.message}>
          <input
            {...register('codigoSBNGeneral')}
            placeholder="Ej. 95220163"
            className={inputCls}
          />
        </Field>
        <Field label="Correlativo SBN" error={errors.codigoSBNCorrelativo?.message}>
          <input
            {...register('codigoSBNCorrelativo')}
            placeholder="Ej. 1"
            className={inputCls}
          />
        </Field>

        <Field label="Fecha de ingreso" error={errors.fechaIngreso?.message}>
          <input type="date" {...register('fechaIngreso')} className={inputCls} />
        </Field>
        <Field label="Fecha del documento" error={errors.fechaDocumento?.message}>
          <input type="date" {...register('fechaDocumento')} className={inputCls} />
        </Field>

        <Field label="Entidad / dependencia" error={errors.entidadDependencia?.message}>
          <input
            {...register('entidadDependencia')}
            placeholder="Ej. MINEDU"
            className={inputCls}
          />
        </Field>
        <Field label="Documento sustentatorio" error={errors.documentoSustentatorio?.message}>
          <input
            {...register('documentoSustentatorio')}
            placeholder="Ej. PECOSA N° 00001"
            className={inputCls}
          />
        </Field>
      </Section>

      <Section
        icon={BanknotesIcon}
        title="Valorización"
        description="Valores en soles según el inventario físico."
      >
        <Field label="Valor unitario (S/)" error={errors.valorUnitario?.message}>
          <input
            type="number"
            min={0}
            step="0.01"
            {...register('valorUnitario')}
            className={inputCls}
          />
        </Field>
        <Field
          label="Valor total (S/)"
          error={errors.valorTotal?.message}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            {...register('valorTotal')}
            className={inputCls}
          />
        </Field>

        {Number(valorTotal) === 0 && Number(cantidad) > 0 && Number(valorUnitario) > 0 && (
          <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-xs text-gray-500">
              Total sugerido: {Number(cantidad)} × S/ {Number(valorUnitario).toFixed(2)} ={' '}
              <span className="font-semibold text-gray-700">
                S/ {(Number(cantidad) * Number(valorUnitario)).toFixed(2)}
              </span>
            </p>
            <button
              type="button"
              onClick={() =>
                setValue('valorTotal', Number(cantidad) * Number(valorUnitario))
              }
              className="text-xs font-semibold text-[#538f65] hover:underline"
            >
              Usar este total
            </button>
          </div>
        )}

        <Field label="Notas" error={errors.notas?.message} className="sm:col-span-2">
          <textarea
            {...register('notas')}
            rows={2}
            placeholder="Observaciones adicionales"
            className={inputCls}
          />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-2">
        <Link
          to="/inventory"
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
          {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar bien'}
        </button>
      </div>
    </form>
  );
}
