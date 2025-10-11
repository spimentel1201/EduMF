import { closeDB } from '../config/database';
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
    console.log('🌱 Iniciando carga de datos iniciales...');

    const adminUser = await User.create({
      firstName: 'Administrador',
      lastName: 'Principal',
      gender: 'M',
      birthdate: new Date('2000-01-01'),
      email: 'admin@gmail.com',
      password: 'admin123',
      role: 'admin',
      dni: '12345678',
      status: 'active'
    });
    console.log('✅ Usuario administrador creado:', adminUser.email);

    const teacherUser = await User.create({
      firstName: 'Profesor',
      lastName: 'Ejemplo',
      gender: 'M',
      birthdate: new Date('2000-01-01'),
      email: 'teacher@gmail.com',
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

    const teacherStaff = await Staff.create({
      dni: '87654321',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      email: '87654321@gmail.com',
      role: 'Docente',
      level: 'Secundaria',
      status: 'Activo',
      phone: '987654321',
      address: 'Av. Principal 123',
      userId: teacherUser._id
    });

    const directorStaff = await Staff.create({
      dni: '12345688',
      firstName: 'María',
      lastName: 'González',
      email: '12345688@gmail.com',
      role: 'Dirección',
      level: 'General',
      status: 'Activo',
      phone: '987654322',
      address: 'Av. Central 456',
      userId: adminUser._id
    });

    const currentYear = new Date().getFullYear();
    const schoolYear = await SchoolYear.create({
      name: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(currentYear, 2, 1),
      endDate: new Date(currentYear + 1, 11, 15),
      status: 'Activo'
    });

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

    const timeSlots = await TimeSlot.create([
      {
        name: 'Primera hora',
        startTime: '08:30',
        endTime: '09:15',
        type: 'Clase',
        status: 'Activo'
      },
      {
        name: 'Segunda hora',
        startTime: '09:15',
        endTime: '10:00',
        type: 'Clase',
        status: 'Activo'
      },
      {
        name: 'Tercera hora',
        startTime: '10:00',
        endTime: '10:45',
        type: 'Clase',
        status: 'Activo'
      }
    ]);

    const schedules = await CourseSchedule.create([
      {
        courseId: courses[0]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[0]._id,
        schoolYearId: schoolYear._id,
        dayOfWeek: 'Lunes',
        classroom: 'A-101',
        status: 'Activo'
      },
      {
        courseId: courses[0]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[1]._id,
        schoolYearId: schoolYear._id,
        dayOfWeek: 'Martes',
        classroom: 'A-101',
        status: 'Activo'
      },
      {
        courseId: courses[1]._id,
        sectionId: sections[0]._id,
        teacherId: teacherStaff._id,
        timeSlotId: timeSlots[2]._id,
        schoolYearId: schoolYear._id,
        dayOfWeek: 'Miércoles',
        classroom: 'A-102',
        status: 'Activo'
      }
    ]);

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

const shouldSeed = async () => {
  try {
    const userCount = await User.countDocuments();
    const shouldSeed = userCount === 0;
    return shouldSeed;
  } catch (error) {
    console.error('Error verificando base de datos:', error);
    return false;
  }
};

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