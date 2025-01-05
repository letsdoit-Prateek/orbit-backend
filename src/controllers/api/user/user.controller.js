/* eslint-disable */
import multer from "multer";
import sendResponse from "../../../util/responseSender";
import Controller from "../../Controller";
import ControllerFactory from "../../ControllerFactory";
import UserService from "./user.service";

export default class User extends Controller {
  routes() {
    // Configure the route and function name
    const routingConfig = {
      get: {
        "/profile": "getUserProfile",
      },
    };
    return routingConfig;
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

  // --------------------------------------------------------------------------------------------
  // ------------------------------------ USER  ------------------------------------------
  // --------------------------------------------------------------------------------------------

  // API TO GET USER DETAILS
  /**
   * @swagger
   * /api/user/profile:
   *   get:
   *     summary: Get user profile details.
   *     description: Get user profiles details.
   *     security:
   *      - TokenAuth: []
   *      - ClientIdAndSecretAuth: []
   *     tags: [User]
   *     parameters:
   *       - name: userId
   *         in: query
   *         description: userId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successful response with a list of user profiles
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   firstName:
   *                     type: string
   *                     description: user first name
   *                   lastName:
   *                     type: string
   *                     description: user last name
   *                   email:
   *                     type: string
   *                     description: user email address
   *                   mobileNO:
   *                     type: string
   *                     description: user mobile number
   *                   mandateId:
   *                     type: string
   *                     description: user mandateId
   *                   mandateUrl:
   *                     type: string
   *                     description: user mandateUrl
   *                   mandateStatus:
   *                     type: string
   *                     description: user mandateStatus
   *                   uccCode:
   *                     type: string
   *                     description: user uccCode
   *       500:
   *         description: Server error occurred
   */
  static async getUserProfile({ req, res } = {}) {
    try {
      const result = await UserService.getUserProfile({
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.sendCustomSuccessObjResponse({
        response: res,
        resultObj: result,
      });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }
}

ControllerFactory.register(User);
