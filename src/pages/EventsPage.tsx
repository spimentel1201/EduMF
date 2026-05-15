import { useState, useEffect } from 'react';
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
import { eventService, EventDTO, EventCategory } from '../services/eventService';

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

/** Formats an ISO date string to a human-readable Spanish date, e.g. "15 may. 2026" */
function formatEventDate(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-PE', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
    timeZone: 'UTC',
  });
}

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

function EventCard({ event }: { event: EventDTO }) {
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
            <span>{formatEventDate(event.date)}</span>
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

function FeaturedEventCard({ event }: { event: EventDTO }) {
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

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await eventService.getEvents({
          search: search || undefined,
          category: activeCategory !== 'all' ? activeCategory : undefined,
          page,
          limit: 6,
        });
        if (!cancelled) {
          setEvents(response.data);
          setTotal(response.total);
          setTotalPages(response.totalPages);
        }
      } catch (err) {
        if (!cancelled) {
          setError('No se pudieron cargar los eventos. Intenta de nuevo.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [search, activeCategory, page]);

  const featuredEvent = events.find((e) => e.featured);
  const nonFeaturedEvents = events.filter((e) => !e.featured);

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

      {/* ── Loading Spinner ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Error Message ── */}
      {!loading && error && (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* ── Grid + Featured ── */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nonFeaturedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {/* Featured card occupies one cell when it fits */}
          {featuredEvent && page === 1 && (
            <FeaturedEventCard event={featuredEvent} />
          )}

          {nonFeaturedEvents.length === 0 && !featuredEvent && (
            <div className="col-span-3 flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarDaysIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No se encontraron eventos</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
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
