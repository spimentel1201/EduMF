import fs from 'fs';
import path from 'path';
import { connectDB, closeDB } from '../config/database';
import {
  FRASE_CONFIRMACION_RESET,
  getResetPreview,
  resetStudents,
} from '../services/studentResetService';

/**
 * Reinicia los datos de estudiantes (borra alumnos y todo lo asociado).
 *
 * Uso:
 *   npm run reset:students                → solo muestra qué se borraría
 *   npm run reset:students -- --confirmar → borra y guarda el backup JSON
 *
 * El backup se escribe en backend/backups/ (ignorado por git).
 */
const args = process.argv.slice(2);
const confirmar = args.includes('--confirmar');
const sinBackup = args.includes('--sin-backup');

(async () => {
  await connectDB();

  const preview = await getResetPreview();
  console.log('\nDatos que se eliminarían:');
  console.log(`  Estudiantes.............. ${preview.estudiantes}`);
  console.log(`  Matrículas............... ${preview.matriculas}`);
  console.log(`  Asistencias.............. ${preview.asistencias}`);
  console.log(`  Detalles de asistencia... ${preview.detallesAsistencia}`);
  console.log(`  Deudas................... ${preview.deudas}`);
  console.log(`  Transacciones............ ${preview.transacciones}`);
  console.log(`  DNI escolar.............. ${preview.dniEscolar}`);
  console.log(`  Asistencia a eventos..... ${preview.eventos}`);
  console.log(`  Incidencias.............. ${preview.incidentes}`);
  console.log(`  Secciones a reiniciar.... ${preview.seccionesAReiniciar}`);

  if (!confirmar) {
    console.log(
      `\nModo simulación (no se borró nada). Para ejecutar:\n  npm run reset:students -- --confirmar\n`
    );
    await closeDB();
    return;
  }

  const { backup, resumen } = await resetStudents(FRASE_CONFIRMACION_RESET);

  if (!sinBackup) {
    const carpeta = path.resolve(process.cwd(), 'backups');
    fs.mkdirSync(carpeta, { recursive: true });
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const archivo = path.join(carpeta, `reset-estudiantes-${marca}.json`);
    fs.writeFileSync(archivo, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`\nBackup guardado en: ${archivo}`);
  }

  console.log('\nReinicio completado:');
  console.log(`  Estudiantes eliminados... ${resumen.estudiantes}`);
  console.log(`  Matrículas eliminadas.... ${resumen.matriculas}`);
  console.log(`  Deudas eliminadas........ ${resumen.deudas}`);
  console.log(`  Secciones reiniciadas.... ${resumen.seccionesAReiniciar}`);

  await closeDB();
  process.exit(0);
})().catch(async (error) => {
  console.error('Error al reiniciar estudiantes:', error);
  await closeDB();
  process.exit(1);
});
