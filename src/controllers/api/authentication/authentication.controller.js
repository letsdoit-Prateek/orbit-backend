/* eslint-disable */
import sendResponse from "../../../util/responseSender";
import Utils from "../../../util/utils";
import Controller from "../../Controller";
import ControllerFactory from "../../ControllerFactory";
import AuthService from "./authentication.service";
const passport = require("passport");

export default class Authentication extends Controller {
  routes() {
    // Configure the route and function name
    const routingConfig = {
      post: {
        "/user/validate": "validateUserWithoutOtp",
        "/otp": "sendOtpToUser",
        "/signUp": "signUpUser",
        "/login/email": "loginWithEmail",
        "/user": "authenticateUserWithOtp",
        "/verify-email": "VerifyEmail",
        "/authenticate-email": "authenticateEmailOtp",
        "/verify-otp": "verifyOTP",
        "/login/mobile": "authenticateMobile",
      },
      patch: {
        "/user/reset-otp": "resetOtpAttempts",
        "/user/fcmToken": "updateUserFCMToken",
        "/password": "updatePassword",
        "/reset-password": "resetPassword",
      },
      put: { "/password": "setPasswordForUser" },
    };
    return routingConfig;
  }

  // Register other routes
  registerOtherRoutes(router) {
    router.post(
      "/b2c/login",
      passport.authenticate("oauth-bearer", { session: false }),
      Controller.wrap(async (req, res) =>
        Authentication.b2cLogin({ req: req, res: res })
      )
    );
  }

  /**
   * @swagger
   * components:
   *   securitySchemes:
   *     TokenAuth:                  # Bearer Token (JWT) scheme
   *       type: http
   *       scheme: bearer
   *       description: Use a Bearer Token (JWT) to authenticate access to APIs.
   *     ClientIdAndSecretAuth:      # Client ID and Secret scheme
   *       type: apiKey
   *       in: header
   *       name: Authorization
   *       description: Use a Client ID and Secret for authentication.
   */

  // ---------------------------------------------------------------------
  // ---------------------------- AUTHENTICATION -------------------------
  // ---------------------------------------------------------------------

  // API TO VALIDATE USER WITHOUT OTP LOGIN
  /**
   * @swagger
   * /api/authentication/user/validate:
   *   post:
   *     summary: To validate a user without otp.
   *     description: To validate a user without otp.
   *     tags: [Authentication]
   *     parameters:
   *       - name: mobileNo
   *         in: query
   *         description: Mobile Number of the user
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the created ID of the new session
   *       500:
   *         description: Server error occurred
   */
  static async validateUserWithoutOtp({ req, res } = {}) {
    try {
      const result = await AuthService.validateUserWithoutOtp({
        mobileNo: Utils.$isValid(req.query.mobileNo)
          ? req.query.mobileNo
          : null,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO RESET OTP ATTEMPTS FOR A USER
  /**
   * @swagger
   * /api/authentication/user/reset-otp:
   *   patch:
   *     summary: To reset otp attempts for a user.
   *     description: To reset otp attempts for a user.
   *     security:
   *       - ClientIdAndSecretAuth: []
   *     tags: [Authentication]
   *     parameters:
   *       - name: mobileNo
   *         in: query
   *         description: Mobile Number of the user
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the created ID of the new session
   *       500:
   *         description: Server error occurred
   */
  static async resetOtpAttempts({ req, res } = {}) {
    try {
      const result = await AuthService.resetOtpAttempts({
        mobileNo: Utils.$isValid(req.query.mobileNo)
          ? req.query.mobileNo
          : null,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO UPDATE FCM TOKEN FOR THE USER
  /**
   * @swagger
   * /api/authentication/user/fcmToken/:
   *   patch:
   *     summary: update fcm token of the user
   *     description: update fcm token of the user
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 description: fcmToken.
   *     tags: [Authentication]
   *     responses:
   *       200:
   *         description: Returns the created ID of the new session
   *       500:
   *         description: Server error occurred
   */
  static async updateUserFCMToken({ req, res } = {}) {
    const data = req.body;
    try {
      const result = await AuthService.updateUserFCMToken({
        userId: await Controller.getUserId({ req: req }),
        fcmToken: data.fcmToken,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO SEND OTP TO USER
  /**
   * @swagger
   * /api/authentication/otp:
   *   post:
   *     summary: Send otp to mobile number.
   *     description: Send otp to mobile number.
   *     security:
   *       - ClientIdAndSecretAuth: []
   *     parameters:
   *       - name: mobileNo
   *         in: query
   *         description: mobile number
   *         required: true
   *         schema:
   *           type: string
   *           minimum: 10
   *       - name: hash
   *         in: query
   *         description: otp hash
   *         required: false
   *         schema:
   *           type: string
   *     tags: [Authentication]
   *     responses:
   *       200:
   *         description: Sends the otp to provided mobile no.
   *       500:
   *         description: Server error occurred
   */
  static async sendOtpToUser({ req, res } = {}) {
    try {
      const result = await AuthService.sendOtpToUser({
        mobileNo: req.query.mobileNo,
        hash: Utils.$isValid(req.query.hash) ? req.query.hash : null,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // ---------------------------------------------------------------------
  // ------------------------------ B2C LOGIN ----------------------------
  // ---------------------------------------------------------------------

  // API TO LOGIN USING AZURE B2C
  /**
   * @swagger
   * /api/authentication/b2c/login:
   *   post:
   *     summary: Login using azure b2c.
   *     description: Login using azure b2c.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     responses:
   *       200:
   *         description: Returns i4e jwt token
   *       500:
   *         description: Server error occurred
   */
  static async b2cLogin({ req, res } = {}) {
    try {
      const authInfo = Utils.$isValidJson(req.authInfo) ? req.authInfo : null;
      const result = await AuthService.b2cLogin({ authInfo });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO SIGNUP USER ESPECIALLY WITH EMAIL
  /**
   * @swagger
   * /api/authentication/signUp:
   *   post:
   *     summary: SignUp user.
   *     description: SignUp user using email or mobile number.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               dateOfBirth:
   *                 type: string
   *               mobileNo:
   *                 type: string
   *               emailId:
   *                 type: string
   *               genderId:
   *                 type: integer
   *               password:
   *                 type: string
   *               referralCode:
   *                 type: string
   *               consentForCommunication:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns response wheter user created successfully or not.
   *       500:
   *         description: Server error occurred
   */
  static async signUpUser({ req, res } = {}) {
    try {
      const {
        firstName,
        lastName,
        dateOfBirth,
        mobileNo,
        emailId,
        genderId,
        password,
        referralCode,
        consentForCommunication,
      } = req.body;
      const result = await AuthService.signUpUser({
        firstName,
        lastName,
        dateOfBirth,
        mobileNo,
        emailId,
        genderId,
        password,
        referralCode,
        consentForCommunication,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO LOGIN WITH EMAIL
  /**
   * @swagger
   * /api/authentication/login/email:
   *   post:
   *     summary: Login to I4E using emailId and password.
   *     description: Login to I4E using emailId and password.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               emailId:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns i4e jwt token
   *       500:
   *         description: Server error occurred
   */
  static async loginWithEmail({ req, res } = {}) {
    try {
      const result = await AuthService.loginWithEmail({
        emailId: req.body.emailId,
        password: req.body.password,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO LOGIN USING MOBILE NUMBER
  /**
   * @swagger
   * /api/authentication/login/mobile:
   *   post:
   *     summary: API to login using mobile number.
   *     description: API to login using mobile number.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               clientID:
   *                 type: string
   *               data:
   *                 type: string
   *               source:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns i4e jwt token
   *       500:
   *         description: Server error occurred
   */
  static async authenticateMobile({ req, res } = {}) {
    try {
      const result = await AuthService.authenticateMobile({
        clientID: req.body?.clientID,
        encryptedOTP: req.body?.data,
        source: Utils.$nullify(req.body?.source),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO VERIFY OTP
  /**
   * @swagger
   * /api/authentication/verify-otp:
   *   post:
   *     summary: API to verify OTP using mobile number.
   *     description: API to verify OTP using mobile number.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               clientID:
   *                 type: string
   *               data:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns i4e jwt token
   *       500:
   *         description: Server error occurred
   */
  static async verifyOTP({ req, res } = {}) {
    try {
      const result = await AuthService.verifyMobileOtp({
        clientID: req.body?.clientID,
        encryptedOTP: req.body?.data,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO UPDATE THE PASSWORD FOR THE USER USING EMAIL ID
  /**
   * @swagger
   * /api/authentication/password:
   *   patch:
   *     summary: Update/Change the account password using emaildId.
   *     description: Update/Change the account password using emaildId.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               emailId:
   *                 type: string
   *               oldPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns true or false whether updation of password is successfull or not.
   *       500:
   *         description: Server error occurred
   */
  static async updatePassword({ req, res } = {}) {
    try {
      const result = await AuthService.updatePassword({
        emailId: req.body.emailId,
        oldPassword: req.body.oldPassword,
        newPassword: req.body.newPassword,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO SET PASSWORD FOR EXISTING USER USING EMAIL ID
  /**
   * @swagger
   * /api/authentication/password:
   *   put:
   *     summary: Set password for existing account using emailId.
   *     description: Set password for existing account using emailId.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               emailId:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns true or false whether updation of password is successfull or not.
   *       500:
   *         description: Server error occurred
   */
  static async setPasswordForUser({ req, res } = {}) {
    try {
      const result = await AuthService.setPasswordForUser({
        emailId: req.body.emailId,
        password: req.body.password,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO AUTHENTICATE USER USING MOBILE NUMBER
  /**
   * @swagger
   * /api/authentication/user:
   *   post:
   *     summary: Authenticate user with mobile number and otp reference.
   *     description: Authenticate user with mobile number and otp reference.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     parameters:
   *       - name: token
   *         in: query
   *         description: Encrypted otp token.
   *         required: true
   *         schema:
   *           type: string
   *       - name: mobileNo
   *         in: query
   *         description: Mobile Number.
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns i4e jwt token
   *       500:
   *         description: Server error occurred
   */
  static async authenticateUserWithOtp({ req, res } = {}) {
    try {
      const result = await AuthService.authenticateUserWithOtp({
        token: req.query.token,
        mobileNo: req.query.mobileNo,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO SEND VERIFICATION CODE (OTP) TO EMAIL
  /**
   * @swagger
   * /api/authentication/verify-email:
   *   post:
   *     summary: Send otp to the email address for email verification.
   *     description: Send otp to the email address for email verification.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               emailId:
   *                 type: string
   *                 description: emailId.
   *     responses:
   *       200:
   *         description: Sends the otp to Email Id
   *       500:
   *         description: Server error occurred
   */
  static async VerifyEmail({ req, res } = {}) {
    try {
      const result = await AuthService.VerifyEmail({
        emailId: req.body.emailId,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO AUTHENTICATE THE OTP SENT TO EMAIL
  /**
   * @swagger
   * /api/authentication/authenticate-email:
   *   post:
   *     summary: verfiy otp sent to the entered email
   *     description: verfiy otp sent to the entered email
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               clientID:
   *                 type: string
   *                 description: emailId.
   *               data:
   *                 type: string
   *                 description: encrypted OTP token.
   *     responses:
   *       200:
   *         description: Sends the otp to Email Id
   *       500:
   *         description: Server error occurred
   */
  static async authenticateEmailOtp({ req, res } = {}) {
    try {
      const result = await AuthService.authenticateEmailOtp({
        emailId: req.body.clientID,
        token: req.body.data,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO RESET THE PASSWORD FOR THE USER USING EMAIL ID
  /**
   * @swagger
   * /api/authentication/reset-password:
   *   patch:
   *     summary: Reset the account password using emaildId.
   *     description: Reset the account password using emaildId.
   *     tags: [Authentication]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               emailId:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns true or false whether updation of password is successfull or not.
   *       500:
   *         description: Server error occurred
   */
  static async resetPassword({ req, res } = {}) {
    try {
      const result = await AuthService.resetPassword({
        emailId: req.body.emailId,
        newPassword: req.body.newPassword,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }
}

ControllerFactory.register(Authentication);
