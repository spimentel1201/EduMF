import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  UserGroupIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  imageUrl?: string;
  attendeesCount?: number;
  featured?: boolean;
}

type EventCategory = 'Académico' | 'Artes' | 'Deportes' | 'Cultura' | 'Otro';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<EventCategory, { bg: string; text: string }> = {
  Académico: { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  Artes:     { bg: 'bg-purple-100', text: 'text-purple-700'},
  Deportes:  { bg: 'bg-orange-100', text: 'text-orange-700'},
  Cultura:   { bg: 'bg-amber-100',  text: 'text-amber-700' },
  Otro:      { bg: 'bg-gray-100',   text: 'text-gray-600'  },
};

const ALL_CATEGORIES: ('all' | EventCategory)[] = [
  'all', 'Académico', 'Artes', 'Deportes', 'Cultura', 'Otro',
];

// ─── Mock data (will be replaced by API) ─────────────────────────────────────
const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Feria de Ciencias',
    description: 'Explora las innovaciones y proyectos experimentales desarrollados por los estudiantes de secundaria.',
    category: 'Académico',
    date: '15 de Octubre, 2024',
    timeStart: '09:00 AM',
    timeEnd: '14:00 PM',
    location: 'Gimnasio Central',
    attendeesCount: 120,
    featured: false,
  },
  {
    id: '2',
    title: 'Concierto de Otoño',
    description: 'Una velada mágica con la orquesta sinfónica escolar interpretando piezas clásicas y modernas.',
    category: 'Artes',
    date: '22 de Octubre, 2024',
    timeStart: '18:30 PM',
    timeEnd: '20:30 PM',
    location: 'Auditorio Principal',
    attendeesCount: 85,
    featured: false,
  },
  {
    id: '3',
    title: 'Maratón Solidaria',
    description: 'Corre por una causa. Evento deportivo anual para recaudar fondos destinados a mejoras en la institución.',
    category: 'Deportes',
    date: '5 de Noviembre, 2024',
    timeStart: '08:00 AM',
    timeEnd: '12:00 PM',
    location: 'Campo de Atletismo',
    attendeesCount: 200,
    featured: false,
  },
  {
    id: '4',
    title: 'Feria Literaria',
    description: 'Encuentros con autores locales, talleres de escritura creativa e intercambio de libros. Un espacio para fomentar la lectura.',
    category: 'Cultura',
    date: '10-12 Nov, 2024',
    timeStart: '10:00 AM',
    timeEnd: '18:00 PM',
    location: 'Biblioteca Central',
    attendeesCount: 60,
    featured: false,
  },
  {
    id: '5',
    title: 'Gran Gala de Fin de Año',
    description: 'No te pierdas la Gran Gala de Fin de Año. Las plazas son limitadas y se requiere reserva previa.',
    category: 'Cultura',
    date: '20 de Diciembre, 2024',
    timeStart: '19:00 PM',
    timeEnd: '23:00 PM',
    location: 'Salón de Actos',
    attendeesCount: 0,
    featured: true,
  },
  {
    id: '6',
    title: 'Olimpiadas Internas',
    description: 'Competencias deportivas entre secciones en distintas disciplinas: fútbol, básquet, atletismo y más.',
    category: 'Deportes',
    date: '18 de Noviembre, 2024',
    timeStart: '08:00 AM',
    timeEnd: '17:00 PM',
    location: 'Canchas Exteriores',
    attendeesCount: 310,
    featured: false,
  },
];

const ITEMS_PER_PAGE = 6;

// ─── Sub-components ─────────────────────────────────────────────────────────

function EventImagePlaceholder({ category }: { category: EventCategory }) {
  const style = CATEGORY_STYLES[category];
  return (
    <div className={`w-full h-28 flex flex-col items-center justify-center ${style.bg} rounded-t-xl`}>
      <PhotoIcon className={`w-8 h-8 ${style.text} opacity-50`} />
      <span className={`text-xs mt-1 ${style.text} opacity-60`}>Sin imagen</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: EventCategory }) {
  const style = CATEGORY_STYLES[category];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {category}
    </span>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image / Placeholder */}
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-28 object-cover"
        />
      ) : (
        <EventImagePlaceholder category={event.category} />
      )}

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CategoryBadge category={event.category} />
          {event.attendeesCount !== undefined && event.attendeesCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <UserGroupIcon className="w-3.5 h-3.5" />
              {event.attendeesCount}
            </span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{event.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">{event.description}</p>

        {/* Meta */}
        <div className="space-y-1 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{event.timeStart} – {event.timeEnd}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{event.location}</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/events/${event.id}/attendance`}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: '#538f65' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
        >
          <UserGroupIcon className="w-4 h-4" />
          Registrar Asistencia
        </Link>
      </div>
    </div>
  );
}

function FeaturedEventCard({ event }: { event: Event }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between text-white h-full"
      style={{ background: '#538f65' }}
    >
      <div className="text-2xl mb-3">✦</div>
      <div>
        <p className="font-bold text-base mb-2">{event.title}</p>
        <p className="text-sm opacity-85 mb-4 leading-relaxed">{event.description}</p>
      </div>
      <Link
        to={`/events/${event.id}/attendance`}
        className="bg-white text-sm font-semibold px-4 py-2 rounded-xl text-center block transition-opacity hover:opacity-90"
        style={{ color: '#538f65' }}
      >
        Ver Detalles
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | EventCategory>('all');
  const [page, setPage] = useState(1);

  const filtered = MOCK_EVENTS.filter((e) => {
    const matchCat = activeCategory === 'all' || e.category === activeCategory;
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && !e.featured;
  });

  const featuredEvent = MOCK_EVENTS.find((e) => e.featured);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCategoryChange = (cat: 'all' | EventCategory) => {
    setActiveCategory(cat);
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Catálogo de Eventos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Explora y gestiona las actividades académicas y extracurriculares.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
            <FunnelIcon className="w-4 h-4" />
            Filtrar
          </button>
          <Link
            to="/events/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors"
            style={{ background: '#538f65' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
          >
            <PlusIcon className="w-4 h-4" />
            Nuevo Evento
          </Link>
        </div>
      </div>

      {/* ── Search & Category Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeCategory === cat
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
              style={activeCategory === cat ? { background: '#538f65', borderColor: '#538f65' } : {}}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid + Featured ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

        {/* Featured card occupies one cell when it fits */}
        {featuredEvent && page === 1 && (
          <FeaturedEventCard event={featuredEvent} />
        )}

        {paginated.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-gray-400">
            <CalendarDaysIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No se encontraron eventos</p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className="w-9 h-9 rounded-xl text-sm font-semibold transition-colors"
              style={
                n === page
                  ? { background: '#538f65', color: '#fff' }
                  : { background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0' }
              }
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          >
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
