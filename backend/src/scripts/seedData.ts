import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/database';
import User from '../models/User';
import Staff from '../models/Staff';
import SchoolYear from '../models/SchoolYear';
import Section from '../models/Section';
import Course from '../models/Course';
import CourseSchedule from '../models/CourseSchedule';
import TimeSlot from '../models/TimeSlot';
import Attendance from '../models/Attendance';

const seedData = async () => {
  try {
    await connectDB();
    console.log('🌱 Iniciando carga de datos iniciales...');

    // 1. Crear usuario administrador
    const adminUser = await User.create({
      firstName: 'Administrador',
      lastName: 'Principal',
      gender: 'M',
      birthdate: new Date('2000-01-01'),
      email: 'admin@school.edu',
      password: 'admin123',
      role: 'admin',
      dni: '12345678',
      status: 'active'
    });
    console.log('✅ Usuario administrador creado:', adminUser.email);

    // 2. Crear usuarios de ejemplo
    const teacherUser = await User.create({
      firstName: 'Profesor',
      lastName: 'Ejemplo',
      gender: 'M',
      birthdate: new Date('2000-01-01'),
      email: 'teacher@school.edu',
      password: 'teacher123',
      role: 'teacher',
      dni: '87654321',
      status: 'active'
    });

    const studentUser = await User.create({
      firstName: 'Estudiante',
      lastName: 'Ejemplo',
      gender: 'M',
      birthdate: new Date('2014-01-01'),
      email: 'student@school.edu',
      password: 'student123',
      role: 'student',
      dni: '11223344',
      status: 'active'
    });

    // 3. Crear personal docente
    const teacherStaff = await Staff.create({
      dni: '87654321',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      email: 'teacher@school.edu',
      role: 'Docente',
      level: 'Secundaria',
      status: 'Activo',
      phone: '987654321',
      address: 'Av. Principal 123',
      userId: teacherUser._id
    });

    const directorStaff = await Staff.create({
      dni: '12345678',
      firstName: 'María',
      lastName: 'González',
      email: 'admin@school.edu',
      role: 'Dirección',
      level: 'General',
      status: 'Activo',
      phone: '987654322',
      address: 'Av. Central 456',
      userId: adminUser._id
    });

    // 4. Crear año escolar
    const currentYear = new Date().getFullYear();
    const schoolYear = await SchoolYear.create({
      name: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(currentYear, 2, 1), // 1 de marzo
      endDate: new Date(currentYear + 1, 11, 15), // 15 de diciembre
      status: 'Activo'
    });

    // 5. Crear secciones
    const sections = await Section.create([
      {
        name: '1A Secundaria',
        level: 'Secundaria',
        grade: 1,
        section: 'A',
        maxStudents: 30,
        currentStudents: 25,
        schoolYearId: schoolYear._id,
        teacherId: teacherStaff._id,
        status: 'Activo'
      },
      {
        name: '1B Secundaria',
        level: 'Secundaria',
        grade: 1,
        section: 'B',
        maxStudents: 30,
        currentStudents: 28,
        schoolYearId: schoolYear._id,
        teacherId: teacherStaff._id,
        status: 'Activo'
      }
    ]);

    // 6. Crear cursos
    const courses = await Course.create([
      {
        name: 'Matemáticas',
        code: 'MAT-5A',
        description: 'Curso de matemáticas para 5to grado',
        level: 'Primaria',
        grade: 5,
        credits: 4,
        status: 'Activo'
      },
      {
        name: 'Comunicación',
        code: 'COM-5A',
        description: 'Curso de comunicación para 5to grado',
        level: 'Primaria',
        grade: 5,
        credits: 4,
        status: 'Activo'
      },
      {
        name: 'Ciencias',
        code: 'CIE-6B',
        description: 'Curso de ciencias para 6to grado',
        level: 'Primaria',
        grade: 6,
        credits: 3,
        status: 'Activo'
      }
    ]);

    // 7. Crear franjas horarias
    const timeSlots = await TimeSlot.create([
      {
        name: 'Primera hora',
        startTime: '08:00',
        endTime: '08:45',
        type: 'Clase',
        status: 'Activo'
      },
      {
        name: 'Segunda hora',
        startTime: '08:45',
        endTime: '09:30',
        type: 'Clase',
        status: 'Activo'
      },
      {
        name: 'Tercera hora',
        startTime: '09:45',
        endTime: '10:30',
        type: 'Clase',
        status: 'Activo'
      }
    ]);

    // 8. Crear horarios de cursos
    const schedules = await CourseSchedule.create([
      {
        courseId: courses[0]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[0]._id,
        dayOfWeek: 'Lunes',
        classroom: 'A-101',
        status: 'Activo'
      },
      {
        courseId: courses[0]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[1]._id,
        dayOfWeek: 'Martes',
        classroom: 'A-101',
        status: 'Activo'
      },
      {
        courseId: courses[1]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[2]._id,
        dayOfWeek: 'Miércoles',
        classroom: 'A-102',
        status: 'Activo'
      }
    ]);

    // 9. Crear asistencia de ejemplo
    const attendance = await Attendance.create({
      date: new Date(),
      sectionId: sections[0]._id,
      courseScheduleId: schedules[0]._id,
      teacherId: teacherStaff._id,
      status: 'Tomada',
      notes: 'Clase normal',
      details: [
        {
          studentId: studentUser._id,
          status: 'Presente',
          notes: ''
        }
      ]
    });

    console.log('✅ Datos iniciales creados exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   - Usuarios: ${await User.countDocuments()}`);
    console.log(`   - Personal: ${await Staff.countDocuments()}`);
    console.log(`   - Años escolares: ${await SchoolYear.countDocuments()}`);
    console.log(`   - Secciones: ${await Section.countDocuments()}`);
    console.log(`   - Cursos: ${await Course.countDocuments()}`);
    console.log(`   - Horarios: ${await CourseSchedule.countDocuments()}`);
    console.log(`   - Asistencias: ${await Attendance.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error al crear datos iniciales:', error);
  } finally {
    await closeDB();
  }
};

// Verificar si la base de datos está vacía antes de sembrar
const shouldSeed = async () => {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    const shouldSeed = userCount === 0;
    await closeDB();
    return shouldSeed;
  } catch (error) {
    console.error('Error verificando base de datos:', error);
    return false;
  }
};

// Ejecutar solo si está vacío
if (require.main === module) {
  shouldSeed().then(seed => {
    if (seed) {
      seedData();
    } else {
      console.log('ℹ️  La base de datos ya contiene datos, omitiendo seed.');
    }
  });
}

export { seedData, shouldSeed };