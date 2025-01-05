/* eslint-disable */
import logger from "../util/logger";
import sendResponse from "../util/responseSender";
import Utils from "../util/utils";

export default class AuthMiddleware {

  static async authenticateRequest(req, res, next) {
    logger.debug("Hitting URL: " + req.url);
    req.context = {};

    // Checking for valid auth headers
    const authHeader = req.headers.authorization;
    if (!Utils.$isValid(authHeader)) {
      logger.error("Headers missing.");
      return sendResponse.unAuthorizedAccess({
        res: res,
        infoMsg: "No token provided!",
      });
    }

    // Verify APIKEY
    return await AuthMiddleware.verifyAPIKey({ req, res, next, authHeader });
  }

  // Veriy Provided APIKEY
  static async verifyAPIKey({ req, res, next, authHeader } = {}) {
    return await this.verifyReqAPIKey({ req, res, next, authHeader });
  }

  // Verify APIKEY
  static async verifyReqAPIKey({ req, res, next, authHeader } = {}) {
    const isAPIkeyVerified = await this.matchI4eAPIKey({
      apiKey: authHeader.split("-")[1],
    });
    if (!isAPIkeyVerified) {
      logger.error("Unmatched I4E ApiKey.");
      return sendResponse.unAuthorizedAccess({
        res: res,
        infoMsg: "Unmatched ApiKey!",
      });
    }
    return next();
  }

  static async matchI4eAPIKey({ apiKey } = {}) {
    const apiKeySecret = "I4EABCD123";
    return (
      Utils.$isValid(apiKey) &&
      apiKeySecret == Buffer.from(apiKey, "base64").toString("utf8")
    );
  }
}
