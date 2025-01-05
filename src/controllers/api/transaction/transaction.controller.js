import Controller from "../../Controller";
import ControllerFactory from "../../ControllerFactory";
import TransactionService from "./transaction.service";
import sendResponse from "../../../util/responseSender";

export default class Transaction extends Controller {
    routes() {
        // Configure the route and function name
        const routingConfig = {
          get: {
            "/": "getAllTranscation",
            "/user-transaction": "getUserWiseTransaction",
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
    // ------------------------------------ Transaction  ------------------------------------------
    // --------------------------------------------------------------------------------------------

   // API TO GET USER WISE TRANSACTIOND DETAILS
  /**
   * @swagger
   * /api/transaction/:
   *   get:
   *     summary: Get all transaction details.
   *     description: Get all transaction details.
   *     security:
   *      - TokenAuth: []
   *      - ClientIdAndSecretAuth: []
   *     tags: [Transaction]
   *     parameters:
   *       - name: status
   *         in: query
   *         description: status
   *         schema:
   *           type: string
   *       - name: type
   *         in: query
   *         description: type
   *         schema:
   *           type: string
   *       - name: fromDate
   *         in: query
   *         description: fromDate
   *         schema:
   *           type: string
   *       - name: toDate
   *         in: query
   *         description: toDate
   *         schema:
   *           type: string
   *       - name: page
   *         in: query
   *         description: page
   *         schema:
   *           type: string
   *       - name: limit
   *         in: query
   *         description: limit
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successful response with a list of all the transaction user wise
   *       500:
   *         description: Server error occurred
   */

  static async getAllTranscation({ req, res }){
    const { status, fromDate, toDate, type, page = 1, limit = 10 } = req.query;
    try {
        const result = await TransactionService.getAllTranscationList({
          status,
          type,
          fromDate,
          toDate,
          page,
          limit
        });
        sendResponse.success({
          res: res,
          resData: result,
        });
    } catch (error) {
    sendResponse.error({ error: error, res: res });
    }  }

  /**
   * @swagger
   * /api/transaction/user-transaction:
   *   get:
   *     summary: Get user wise transaction details.
   *     description: Get user wise transaction details.
   *     security:
   *      - TokenAuth: []
   *      - ClientIdAndSecretAuth: []
   *     tags: [Transaction]
   *     parameters:
   *       - name: userId
   *         in: query
   *         description: userId
   *         schema:
   *           type: string
   *       - name: status
   *         in: query
   *         description: status
   *         schema:
   *           type: string
   *       - name: type
   *         in: query
   *         description: type
   *         schema:
   *           type: string
   *       - name: fromDate
   *         in: query
   *         description: fromDate
   *         schema:
   *           type: string
   *       - name: toDate
   *         in: query
   *         description: toDate
   *         schema:
   *           type: string
   *       - name: page
   *         in: query
   *         description: page
   *         schema:
   *           type: string
   *       - name: limit
   *         in: query
   *         description: limit
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successful response with a list of all the transaction for a user
   *       500:
   *         description: Server error occurred
   */

  static async getUserWiseTransaction({req, res}) {
    const { status, fromDate, toDate, type, page = 1, limit = 10, userId } = req.query;
    try {
        const result = await TransactionService.getUserTranscationList({
            userId,
            status,
            type,
            fromDate,
            toDate,
            page,
            limit
        });
        sendResponse.success({
          res: res,
          resData: result,
        });
    } catch (error) {
    sendResponse.error({ error: error, res: res });
    }
  }
}

ControllerFactory.register(Transaction);
