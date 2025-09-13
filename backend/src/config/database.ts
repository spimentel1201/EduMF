import mongoose from 'mongoose';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// URI de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-attendance';

/**
 * Función para conectar a la base de datos MongoDB
 */
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conexión a MongoDB establecida correctamente');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Función para cerrar la conexión a la base de datos
 */
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada correctamente');
  } catch (error) {
    console.error('Error al cerrar la conexión a MongoDB:', error);
  }
};