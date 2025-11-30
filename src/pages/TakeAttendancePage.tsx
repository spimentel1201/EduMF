import { Link } from 'react-router-dom';

export default function TakeAttendancePage() {
  return (
    <div className="space-y-6 py-6">
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Tomar asistencia</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Selecciona una sección y registra la asistencia de los estudiantes.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-sm text-gray-600">Esta vista está en construcción.</p>
        <div className="mt-4">
          <Link to="/attendance" className="text-primary-600 hover:text-primary-500">
            Ver registros de asistencia
          </Link>
        </div>
      </div>
    </div>
  );
}

