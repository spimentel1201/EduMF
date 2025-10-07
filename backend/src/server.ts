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
import enrollmentRoutes from './routes/enrollmentRoutes'; // Importar las rutas de matrícula

// Cargar variables de entorno
config();

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 5000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Verificar y ejecutar seed si es necesario
    const needsSeeding = await shouldSeed();
    if (needsSeeding) {
      console.log('🌱 Ejecutando seed de datos iniciales...');
      await seedData();
    }
    // Middleware
    //app.use(cors());
    app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    }));
    app.use(express.json());
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
    app.use('/api', attendanceRoutes);
    app.use('/api/enrollments', enrollmentRoutes);
    
    // Middleware de manejo de errores
    app.use(errorHandler);
    
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;