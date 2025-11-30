import { Request, Response } from 'express';
import User from '../models/User';
import Staff from '../models/Staff';
import Section from '../models/Section';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalStaff = await Staff.countDocuments();
    const activeSections = await Section.countDocuments({ status: 'active' });
    const presentRate = 75;

    res.status(200).json({
      data: {
        totalStudents,
        totalStaff,
        activeSections,
        presentRate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};
