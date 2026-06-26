import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import InstitutionConfig from '../models/InstitutionConfig';
import { ApiError } from '../middleware/errorHandler';

// @desc    Obtener configuración institucional (admin)
// @route   GET /api/institution-settings
// @access  Private (admin)
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await InstitutionConfig.findOne({});

    if (!config) {
      // Retorna objeto vacío con HTTP 200 si no existe documento aún
      return res.status(200).json({
        success: true,
        data: {
          name: '',
          address: '',
          phone: '',
          email: '',
          logoBase64: '',
          bgImageBase64: '',
          bgOpacity: 30,
        },
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener datos de branding públicos (sin auth) para la pantalla de login
// @route   GET /api/institution-settings/public
// @access  Public
export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await InstitutionConfig.findOne({}, 'name logoBase64 bgImageBase64 bgOpacity');
    res.status(200).json({
      success: true,
      data: {
        name:          config?.name          ?? '',
        logoBase64:    config?.logoBase64    ?? '',
        bgImageBase64: config?.bgImageBase64 ?? '',
        bgOpacity:     config?.bgOpacity     ?? 30,
      },
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Actualizar configuración institucional
// @route   PUT /api/institution-settings
// @access  Private (admin)
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar campos con express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest(String(errors.array()[0].msg)));
    }

    const { name, address, phone, email, logoBase64, bgImageBase64, bgOpacity } = req.body;

    const updateData: Record<string, string | number> = { name: name.trim() };
    if (address      !== undefined) updateData.address      = address;
    if (phone        !== undefined) updateData.phone        = phone;
    if (email        !== undefined) updateData.email        = email;
    if (logoBase64   !== undefined) updateData.logoBase64   = logoBase64;
    if (bgImageBase64 !== undefined) updateData.bgImageBase64 = bgImageBase64;
    if (bgOpacity    !== undefined) updateData.bgOpacity    = Number(bgOpacity);

    const config = await InstitutionConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};
