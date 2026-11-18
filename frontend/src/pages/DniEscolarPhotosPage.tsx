import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { dniEscolarService } from '@/services/dniEscolarService';
import type { SubirFotosResult } from '@/types/dniEscolar';

const JPEG_QUALITY = 0.72;
const CHUNK_SIZE = 150;

interface FotoProcesada {
  cui: string;
  fotoBase64: string;
  nombreArchivo: string;
}

/** Extrae el CUI del nombre de archivo: "63420256.jpg" → "63420256". */
function cuiDesdeNombre(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '').trim();
  const match = base.match(/([0-9A-Za-z]{6,15})/);
  return match ? match[1].toUpperCase() : '';
}

/** Recorta al centro en proporción 3:4 y redimensiona a 300×400 (JPEG). */
function redimensionar(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const TARGET_W = 300;
      const TARGET_H = 400;
      const targetAspect = TARGET_W / TARGET_H;
      const srcAspect = img.width / img.height;

      // Recorte centrado al 3:4 para que la foto llene el marco sin deformarse.
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (srcAspect > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else if (srcAspect < targetAspect) {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}

export default function DniEscolarPhotosPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [fotos, setFotos] = useState<FotoProcesada[]>([]);
  const [noReconocidas, setNoReconocidas] = useState<string[]>([]);
  const [result, setResult] = useState<SubirFotosResult | null>(null);

  const subirMutation = useMutation({
    mutationFn: async (lote: FotoProcesada[]) => {
      // Subida por bloques para no superar límites de payload
      const resultados: SubirFotosResult[] = [];
      for (let index = 0; index < lote.length; index += CHUNK_SIZE) {
        const chunk = lote.slice(index, index + CHUNK_SIZE);
        resultados.push(
          await dniEscolarService.subirFotos({
            fotos: chunk.map((foto) => ({ cui: foto.cui, fotoBase64: foto.fotoBase64 })),
          })
        );
      }
      return resultados.reduce<SubirFotosResult>(
        (acc, item) => ({
          totalEnviadas: acc.totalEnviadas + item.totalEnviadas,
          actualizadas: acc.actualizadas + item.actualizadas,
          noEncontradas: [...acc.noEncontradas, ...item.noEncontradas],
          invalidas: [...acc.invalidas, ...item.invalidas],
        }),
        { totalEnviadas: 0, actualizadas: 0, noEncontradas: [], invalidas: [] }
      );
    },
    onSuccess: (data) => {
      setResult(data);
      setFotos([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['dni-escolar'] });
      queryClient.invalidateQueries({ queryKey: ['dni-escolar-stats'] });
      toast.success(`${data.actualizadas} fotos cargadas`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las fotos');
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFotos([]);
    setNoReconocidas([]);
    setResult(null);
  };

  const clearFile = () => {
    setFile(null);
    setFotos([]);
    setNoReconocidas([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const procesarZip = async () => {
    if (!file) return;
    setProcesando(true);
    setProgreso(0);
    setFotos([]);
    setNoReconocidas([]);
    setResult(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(
        (entry) => !entry.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(entry.name)
      );

      if (entries.length === 0) {
        toast.error('El ZIP no contiene imágenes');
        return;
      }

      const procesadas: FotoProcesada[] = [];
      const noReconocidasArchivo: string[] = [];

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const nombreBase = entry.name.split('/').pop() || entry.name;
        const cui = cuiDesdeNombre(nombreBase);

        const blob = await entry.async('blob');
        const dataUrl = await blobToDataUrl(blob);

        if (!cui) {
          noReconocidasArchivo.push(nombreBase);
          continue;
        }

        const fotoBase64 = await redimensionar(dataUrl);
        procesadas.push({ cui, fotoBase64, nombreArchivo: nombreBase });

        setProgreso(Math.round(((index + 1) / entries.length) * 100));
      }

      setFotos(procesadas);
      setNoReconocidas(noReconocidasArchivo);
      toast.success(`${procesadas.length} fotos listas para guardar`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo leer el archivo ZIP');
    } finally {
      setProcesando(false);
    }
  };

  const cuisUnicos = new Set(fotos.map((foto) => foto.cui)).size;

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <Link
          to="/dni-escolar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Volver a DNIs escolares
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
          Cargar fotos en lote (ZIP)
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
          Sube un ZIP con las fotos nombradas por CUI (ej.{' '}
          <span className="font-mono">63420256.jpg</span>). Se redimensionan
          automáticamente antes de subirlas.
        </p>
      </div>

      {/* Selección */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="flex flex-col items-center justify-center gap-2 w-full h-40 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors">
          <CloudArrowUpIcon className="w-8 h-8 text-gray-300" />
          <span className="text-sm text-gray-500">
            {file ? (
              <span className="font-semibold text-green-700">{file.name}</span>
            ) : (
              <>
                Haz clic o arrastra el archivo <span className="font-semibold">.zip</span>
              </>
            )}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {file && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <span className="truncate">{file.name}</span>
            <button onClick={clearFile} className="ml-2 flex-shrink-0" aria-label="Quitar archivo">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={procesarZip}
            disabled={!file || procesando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
            style={{ background: '#538f65' }}
          >
            {procesando ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PhotoIcon className="w-4 h-4" />
            )}
            {procesando ? `Procesando… ${progreso}%` : 'Analizar ZIP'}
          </button>
          <span className="text-xs text-gray-400">
            El análisis no guarda nada: primero revisas y luego confirmas.
          </span>
        </div>

        {procesando && (
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${progreso}%`, background: '#538f65' }}
            />
          </div>
        )}
      </section>

      {/* Resultado del análisis */}
      {fotos.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#1a202c' }}>
                {fotos.length} fotos listas · {cuisUnicos} CUI distintos
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Si el mismo CUI aparece dos veces, se guarda la última.
              </p>
            </div>
            <button
              onClick={() => subirMutation.mutate(fotos)}
              disabled={subirMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40"
              style={{ background: '#538f65' }}
            >
              {subirMutation.isPending ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="w-4 h-4" />
              )}
              {subirMutation.isPending ? 'Guardando…' : 'Guardar fotos'}
            </button>
          </div>

          {noReconocidas.length > 0 && (
            <div className="mx-5 mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {noReconocidas.length} archivos sin CUI reconocible (se ignoran)
              </p>
              <p className="mt-1 text-[11px] text-amber-700 truncate">
                {noReconocidas.slice(0, 10).join(', ')}
                {noReconocidas.length > 10 && '…'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-5">
            {fotos.map((foto) => (
              <div key={`${foto.cui}-${foto.nombreArchivo}`} className="text-center">
                <img
                  src={foto.fotoBase64}
                  alt={foto.nombreArchivo}
                  className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200"
                />
                <p className="mt-1 text-[10px] font-mono text-gray-500 truncate">{foto.cui}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resultado de la carga */}
      {result && (
        <section className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-green-800">Carga completada</h2>
              <p className="text-xs text-gray-500 mt-1">
                {result.actualizadas} de {result.totalEnviadas} fotos guardadas.
              </p>

              {result.noEncontradas.length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {result.noEncontradas.length} CUI sin DNI registrado
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    {result.noEncontradas.slice(0, 15).join(', ')}
                    {result.noEncontradas.length > 15 && '…'}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-600">
                    Genera primero los DNIs desde la matrícula para esos estudiantes.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Link
                  to="/dni-escolar"
                  className="inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#538f65' }}
                >
                  Ver DNIs
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
