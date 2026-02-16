import AppointmentService from "../../services/appointment.service.js";

class AppointmentController {

  static async book(req, res, next) {
    try {
      const { appointment_date } = req.body;

      const appointment = await AppointmentService.bookAppointment(
        req.user.id,
        appointment_date,
        false
      );

      res.status(201).json({
        success: true,
        data: appointment
      });

    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const { id } = req.params;

      const appointment = await AppointmentService.cancelAppointment(
        req.user.id,
        id
      );

      res.status(200).json({
        success: true,
        data: appointment
      });

    } catch (error) {
      next(error);
    }
  }

  static async getMine(req, res, next) {
    try {
      const appointments = await AppointmentService.getUserAppointments(
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: appointments
      });

    } catch (error) {
      next(error);
    }
  }
}

export default AppointmentController;