import Controller from "../../Controller";
import ControllerFactory from "../../ControllerFactory";
import TransactionService from "./transaction.service";
import sendResponse from "../../../util/responseSender";

export default class Transaction extends Controller {
    routes() {
        // Configure the route and function name
        const routingConfig = {
          get: {
            "/": "getAllTransactionList",
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
   *     responses:
   *       200:
   *         description: Successful response with a list of all the transaction user wise
   *       500:
   *         description: Server error occurred
   */

  static async getAllTranscationList({ res }){
    try {
        const result = await TransactionService.getAllTranscationList();
        sendResponse.success({
          response: res,
          resultObj: result,
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
   *     responses:
   *       200:
   *         description: Successful response with a list of all the transaction for a user
   *       500:
   *         description: Server error occurred
   */

  static async getUserWiseTransaction({res}) {
    try {
        const result = await TransactionService.getAllTranscationList();
        sendResponse.success({
          response: res,
          resultObj: result,
        });
    } catch (error) {
    sendResponse.error({ error: error, res: res });
    }
  }
}

ControllerFactory.register(Transaction);
