import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { seedData, shouldSeed } from './scripts/seedData';

// Rutas
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import staffRoutes from './routes/staffRoutes';
import schoolYearRoutes from './routes/schoolYearRoutes';
import sectionRoutes from './routes/sectionRoutes';
import courseRoutes from './routes/courseRoutes';
import courseScheduleRoutes from './routes/courseScheduleRoutes';
import timeSlotRoutes from './routes/timeSlotRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import incidentRoutes from './routes/incidentRoutes';
import eventRoutes from './routes/eventRoutes';
import treasuryRoutes from './routes/treasuryRoutes';
import institutionSettingsRoutes from './routes/institutionSettingsRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import dniEscolarRoutes from './routes/dniEscolarRoutes';
import guardianRoutes from './routes/guardianRoutes';
import pushSubscriptionRoutes from './routes/pushSubscriptionRoutes';
import { ejecutarCierreTurno } from './services/attendanceClosureService';
import { asegurarIndiceDiario } from './services/attendanceDayService';

// Cargar variables de entorno
config();

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 5000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    await connectDB();

    const needsSeeding = await shouldSeed();
    if (needsSeeding) {
      console.log('🌱 Ejecutando seed de datos iniciales...');
      await seedData();
    }
    const corsOriginsEnv = process.env.CORS_ORIGINS;
    const allowAllOrigins = !corsOriginsEnv || corsOriginsEnv === '*';
    const allowedOrigins = corsOriginsEnv && corsOriginsEnv !== '*'
      ? corsOriginsEnv.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowAllOrigins) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json({ limit: '5mb' }));
    app.use(morgan('dev'));

    // Rutas de la API
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/staff', staffRoutes);
    app.use('/api/school-years', schoolYearRoutes);
    app.use('/api/sections', sectionRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/course-schedules', courseScheduleRoutes);
    app.use('/api/time-slots', timeSlotRoutes);
    app.use('/api/attendances', attendanceRoutes);
    app.use('/api/enrollments', enrollmentRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/incidents', incidentRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/treasury', treasuryRoutes);
    app.use('/api/institution-settings', institutionSettingsRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/dni-escolar', dniEscolarRoutes);
app.use('/api/guardians', guardianRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);

    // Middleware de manejo de errores
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });

    // Índice único del registro diario.
    void asegurarIndiceDiario();

    // Job de cierre de turno (cada minuto).
    setInterval(() => {
      void ejecutarCierreTurno();
    }, 60 * 1000);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
