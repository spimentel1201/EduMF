import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhotoIcon,
  CheckIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { eventService } from '../services/eventService';

type EventCategory = 'Académico' | 'Artes' | 'Deportes' | 'Cultura' | 'Otro';

const CATEGORIES: EventCategory[] = ['Académico', 'Artes', 'Deportes', 'Cultura', 'Otro'];
const LOCATIONS = ['Patio', 'Aulas', 'Auditorio', 'Gimnasio', 'Biblioteca'];
const GRADES = ['1er Grado', '2do Grado', '3er Grado', '4to Grado', '5to Grado', '6to Grado'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const FIELD_CLASS =
  'w-full px-4 py-3 text-sm bg-[#F7F6F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors placeholder-gray-400 border-none text-gray-700';

const LABEL_CLASS = 'block text-sm font-bold text-gray-600 mb-2';

export default function NewEventPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '' as EventCategory | '',
    imageUrl: '',
    scope: 'general' as 'general' | 'specific',
    grade: '',
    section: '',
    date: '',
    timeStart: '',
    timeEnd: '',
    capacity: '',
    location: '',
    isCustomLocation: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof typeof form, string>> = {};
    if (!form.title.trim())    errs.title    = 'El título es requerido.';
    if (!form.category)        errs.category = 'Selecciona una categoría.';
    if (!form.date)            errs.date     = 'La fecha es requerida.';
    if (!form.timeStart)       errs.timeStart = 'La hora de inicio es requerida.';
    if (!form.timeEnd)         errs.timeEnd   = 'La hora de fin es requerida.';
    if (!form.location.trim()) errs.location = 'La ubicación es requerida.';

    if (form.capacity && parseInt(form.capacity) <= 0) {
      errs.capacity = 'La capacidad debe ser mayor a 0.';
    }

    if (form.scope === 'specific') {
      if (!form.grade)   errs.grade   = 'Selecciona el grado.';
      if (!form.section) errs.section = 'Selecciona la sección.';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await eventService.createEvent({
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        category:    form.category as EventCategory,
        date:        form.date,
        timeStart:   form.timeStart,
        timeEnd:     form.timeEnd,
        location:    form.location.trim(),
        imageUrl:    form.imageUrl.trim() || undefined,
        scope:       form.scope,
        targetGrade:   form.scope === 'specific' ? form.grade   : undefined,
        targetSection: form.scope === 'specific' ? form.section : undefined,
        capacity:    form.capacity ? parseInt(form.capacity) : undefined,
      });
      navigate('/events');
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? err?.message ?? 'Error al crear el evento'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-[2rem] p-8">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">
            
            {/* Left Column */}
            <div className="space-y-5">
              <div>
                <label className={LABEL_CLASS}>Título del Evento</label>
                <input
                  type="text"
                  placeholder="Ej: Feria de Ciencias 2024"
                  value={form.title}
                  onChange={set('title')}
                  className={FIELD_CLASS}
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>

              <div>
                <label className={LABEL_CLASS}>Categoría</label>
                <select
                  value={form.category}
                  onChange={set('category')}
                  className={FIELD_CLASS}
                >
                  <option value="">Seleccionar Categoría</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>

              <div>
                <label className={LABEL_CLASS}>URL de imagen (opcional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={set('imageUrl')}
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Describe los detalles principales del evento..."
                  value={form.description}
                  onChange={set('description')}
                  className={`${FIELD_CLASS} resize-none min-h-[100px]`}
                />
              </div>
            </div>

            {/* Right Column: Image Preview */}
            <div className="flex flex-col h-full">
              <label className={LABEL_CLASS}>Imagen Referencial</label>
              <div className="flex-1 min-h-[250px] w-full rounded-2xl border-2 border-dashed border-gray-200 bg-[#F7F6F2] flex flex-col items-center justify-center relative overflow-hidden">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="object-cover w-full h-full absolute inset-0" />
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <PhotoIcon className="w-10 h-10 text-[#C1BFA8] mb-3" />
                    <span className="text-sm font-medium text-gray-600 mb-1">Haz clic o ingresa una URL de imagen</span>
                    <span className="text-xs tracking-wide text-gray-400 font-medium">JPG, PNG O WEBP (MÁX. 5MB)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Section: Alcance */}
          <div className="bg-[#FAF9F6] rounded-3xl p-6 mb-8">
            <label className="block text-sm font-bold text-gray-600 mb-4">Alcance del Evento</label>
            <div className="flex flex-wrap gap-4 mb-4">
              <label 
                className={`flex items-center gap-3 px-5 py-2.5 rounded-full border cursor-pointer transition-colors ${
                  form.scope === 'general' ? 'border-[#538f65] bg-white text-[#1a202c]' : 'border-transparent bg-white text-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${form.scope === 'general' ? 'border-[#538f65]' : 'border-gray-300'}`}>
                  {form.scope === 'general' && <div className="w-2.5 h-2.5 bg-[#538f65] rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="scope"
                  className="hidden"
                  checked={form.scope === 'general'}
                  onChange={() => setForm(p => ({ ...p, scope: 'general' }))}
                />
                <span className="text-sm font-bold">General (Todos)</span>
              </label>

              <label 
                className={`flex items-center gap-3 px-5 py-2.5 rounded-full border cursor-pointer transition-colors ${
                  form.scope === 'specific' ? 'border-[#538f65] bg-white text-[#1a202c]' : 'border-transparent bg-white text-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${form.scope === 'specific' ? 'border-[#538f65]' : 'border-gray-300'}`}>
                  {form.scope === 'specific' && <div className="w-2.5 h-2.5 bg-[#538f65] rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="scope"
                  className="hidden"
                  checked={form.scope === 'specific'}
                  onChange={() => setForm(p => ({ ...p, scope: 'specific', grade: '', section: '' }))}
                />
                <span className="text-sm font-bold">Grado y Sección Específico</span>
              </label>
            </div>
            
            {form.scope === 'specific' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Grado</label>
                  <select 
                    value={form.grade} 
                    onChange={set('grade')} 
                    className={`w-full px-4 py-3 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 ${errors.grade ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccionar Grado</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {errors.grade && <p className="mt-1 text-xs text-red-500">{errors.grade}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Sección</label>
                  <select 
                    value={form.section} 
                    onChange={set('section')} 
                    className={`w-full px-4 py-3 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 ${errors.section ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccionar Sección</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.section && <p className="mt-1 text-xs text-red-500">{errors.section}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid: Fecha, Hora, Capacidad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <label className={LABEL_CLASS}>Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className={FIELD_CLASS}
              />
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Hora de Inicio</label>
              <input
                type="time"
                value={form.timeStart}
                onChange={set('timeStart')}
                className={FIELD_CLASS}
              />
              {errors.timeStart && <p className="mt-1 text-xs text-red-500">{errors.timeStart}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Hora de Fin</label>
              <input
                type="time"
                value={form.timeEnd}
                onChange={set('timeEnd')}
                className={FIELD_CLASS}
              />
              {errors.timeEnd && <p className="mt-1 text-xs text-red-500">{errors.timeEnd}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Capacidad Estimada</label>
              <input
                type="number"
                placeholder="Ej: 150"
                min="1"
                value={form.capacity}
                onChange={set('capacity')}
                className={FIELD_CLASS}
              />
              {errors.capacity && <p className="mt-1 text-xs text-red-500">{errors.capacity}</p>}
            </div>
          </div>

          {/* Location Selection */}
          <div className="mb-10">
            <label className={LABEL_CLASS}>Lugar del Evento</label>
            <div className="flex flex-wrap items-center gap-3">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, location: loc, isCustomLocation: false }))}
                  className={`px-5 py-2 rounded-full border text-sm font-bold transition-colors flex items-center gap-2 ${
                    form.location === loc && !form.isCustomLocation
                      ? 'border-[#538f65] text-[#538f65]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {form.location === loc && !form.isCustomLocation && <CheckIcon className="w-4 h-4" />}
                  {loc}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, location: '', isCustomLocation: true }))}
                className={`px-5 py-2 rounded-full border border-dashed text-sm font-medium transition-colors ${
                  form.isCustomLocation ? 'border-[#538f65] text-[#538f65]' : 'border-gray-300 text-gray-400 hover:border-gray-400'
                }`}
              >
                + Personalizar
              </button>
            </div>
            
            {form.isCustomLocation && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Ingresa un lugar personalizado..."
                  value={form.location}
                  onChange={set('location')}
                  className={FIELD_CLASS}
                  autoFocus
                />
              </div>
            )}
            {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
          </div>

          {/* Spacer to push buttons to the bottom right visually */}
          <div className="border-t border-gray-100 pt-6 mt-8 flex flex-col items-end gap-3">
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
            <div className="flex justify-end gap-4">
              <Link
                to="/events"
                className="px-8 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 text-sm font-bold text-white rounded-full bg-[#538f65] hover:bg-[#47795a] transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CalendarDaysIcon className="w-5 h-5 text-white/80" />
                {submitting ? 'Creando…' : 'Crear Evento'}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}

