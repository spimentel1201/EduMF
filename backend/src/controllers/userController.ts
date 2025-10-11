import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { validationResult } from 'express-validator';
import fs from 'fs';
import csv from 'csv-parser';

// @route   POST api/users/register
// @desc    Register a new user (student by default)
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, dni, gender, birthdate, email, password } = req.body;

  try {
    let user = await User.findOne({ dni });
    if (user) {
      return res.status(400).json({ msg: 'El usuario con este DNI ya existe' });
    }

    if (email) {
      user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'El usuario con este email ya existe' });
      }
    }

    const userData: any = {
      firstName,
      lastName,
      dni,
      role: 'student',
      status: 'active',
    };

    if (gender) userData.gender = gender;
    if (birthdate) userData.birthdate = birthdate;
    if (email) userData.email = email;
    if (password) userData.password = password;

    user = new User(userData);

    await user.save();

    res.status(201).json({ msg: 'Usuario registrado exitosamente como estudiante', user: { id: user._id, firstName: user.firstName, lastName: user.lastName, dni: user.dni, role: user.role } });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// @route   POST api/users/bulk-register
// @desc    Bulk register users from CSV/Excel
export const bulkRegisterUsers = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No se ha subido ningún archivo.' });
  }

  const usersToCreate: any[] = [];
  const errors: any[] = [];
  let successCount = 0;

  if (req.file.mimetype === 'text/csv') {
    fs.createReadStream(req.file.path, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (row) => {
        usersToCreate.push({
          firstName: row.firstName,
          lastName: row.lastName,
          dni: row.dni,
          gender: row.gender,
          birthdate: row.birthdate,
          email: row.email || undefined,
          password: row.password || undefined,
          role: 'student',
          status: 'active',
        });
      })
      .on('end', async () => {
        fs.unlinkSync(req.file!.path);

        console.log('Iniciando procesamiento de usuarios en lote. Total a procesar:', usersToCreate.length);

        for (const userData of usersToCreate) {
          try {
            let user = await User.findOne({ dni: userData.dni });
            if (user) {
              errors.push({ dni: userData.dni, msg: 'El usuario con este DNI ya existe' });
              console.log(`Error: DNI ${userData.dni} ya existe. Saltando.`);
              continue;
            }

            if (userData.email) {
              user = await User.findOne({ email: userData.email });
              if (user) {
                errors.push({ email: userData.email, msg: 'El usuario con este email ya existe' });
                console.log(`Error: Email ${userData.email} ya existe. Saltando.`);
                continue;
              }
            }

            user = new User(userData);
            await user.save();
            successCount++;
            console.log(`Usuario ${userData.dni} guardado exitosamente.`);
          } catch (err: any) {
            errors.push({ dni: userData.dni, msg: err.message });
            console.error(`Error al guardar usuario ${userData.dni}:`, err.message);
          }
        }

        console.log('Procesamiento de lote finalizado.');
        console.log('Total procesados:', usersToCreate.length);
        console.log('Éxitos:', successCount);
        console.log('Errores:', errors);

        res.status(200).json({
          msg: 'Proceso de carga masiva completado',
          totalProcessed: usersToCreate.length,
          successCount,
          errors,
        });
      })
      .on('error', (err) => {
        fs.unlinkSync(req.file!.path);
        console.error(err.message);
        res.status(500).json({ msg: 'Error al procesar el archivo CSV', error: err.message });
      });
  } else {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ msg: 'Tipo de archivo no soportado. Por favor, suba un archivo CSV.' });
  }
};

/**
 * @desc    Obtener todos los usuarios
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;
    let query = {};

    if (role) {
      query = { role };
    }

    const users = await User.find(query).select('_id firstName lastName email role');
    const formattedUsers = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    next(error);
  }
};