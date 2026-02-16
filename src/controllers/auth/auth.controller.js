import AuthService from "../../services/auth.service.js";

class AuthController {

  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: profile
      });

    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updated = await AuthService.updateProfile(
        req.user.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: updated
      });

    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;