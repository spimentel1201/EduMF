import { connectDB, closeDB } from '../config/database';
import { importGuardians } from '../services/guardianImportService';

/**
 * Alta masiva de tutores para el portal de padres.
 *
 * Uso:
 *   npm run import:guardians                → crea/actualiza tutores y genera CSV
 *   npm run import:guardians -- --dry-run   → simula, sin escribir en Mongo ni CSV
 *   npm run import:guardians -- --sin-csv   → no genera los CSV
 *
 * Los CSV se escriben en backend/backups/guardians/ (ignorado por git porque
 * contienen datos personales). La contraseña inicial es el mismo `loginId`.
 */
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('--simular');
const sinCsv = args.includes('--sin-csv');

(async () => {
  await connectDB();

  const reporte = await importGuardians({ dryRun, escribirCsv: !sinCsv });

  console.log('\nAlta de tutores (portal de padres)');
  console.log(`  Estudiantes activos....... ${reporte.estudiantes}`);
  console.log(`  Familias (cuentas)....... ${reporte.familias}`);
  console.log(`  Familias con hermanos.... ${reporte.familiasConHermanos}`);
  console.log(`  Tutores creados.......... ${reporte.creados}`);
  console.log(`  Tutores actualizados..... ${reporte.actualizados}`);
  console.log(`  Sin cambios.............. ${reporte.sinCambios}`);
  console.log(`  Alumnos pendientes....... ${reporte.pendientes}`);

  if (reporte.conflictos.length > 0) {
    console.log(`\nConflictos detectados (${reporte.conflictos.length}):`);
    for (const conflicto of reporte.conflictos) {
      console.log(`  - ${conflicto}`);
    }
  }

  if (reporte.archivos.credenciales) {
    console.log(`\nCredenciales: ${reporte.archivos.credenciales}`);
  }
  if (reporte.archivos.pendientes) {
    console.log(`Pendientes:   ${reporte.archivos.pendientes}`);
  }

  if (dryRun) {
    console.log('\nModo simulación: no se escribió nada. Quita --dry-run para ejecutar.');
  }

  await closeDB();
  process.exit(0);
})().catch(async (error) => {
  console.error('Error en el alta de tutores:', error);
  await closeDB();
  process.exit(1);
});
