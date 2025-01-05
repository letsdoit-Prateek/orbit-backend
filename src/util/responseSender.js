/* eslint-disable */
import Utils from "./utils";
const baseConfig = require("../config/baseConfig.json");

export default class SendResponse {
  static sendResponse({ status, message, data, response, isError } = {}) {
    const textMsg = Utils.$isValid(message)
      ? message
      : baseConfig.httpStatus[status];
    const resBody = response.responseData;
    resBody.responseCode = status;
    resBody.data = data;
    resBody.message =
      Utils.$isValid(isError) && isError ? { info: textMsg } : textMsg;
    response.send(resBody);
  }

  static sendCustomSuccessObjResponse({ response, resultObj } = {}) {
    const status = 200;
    const resBody = response.responseData;
    resBody.responseCode = status;
    resBody.message = baseConfig.httpStatus[status];
    Object.assign(resBody, resultObj);
    response.send(resBody);
  }

  static success({ res, resData, resMsg } = {}) {
    SendResponse.sendResponse({
      status: 200,
      data: resData,
      response: res,
      message: resMsg,
    });
  }

  static error({ res, error } = {}) {
    SendResponse.sendResponse({
      status: 500,
      message: error.message,
      response: res,
      isError: true,
    });
  }

  static unAuthorizedAccess({ res, resMsg, infoMsg } = {}) {
    const resData = Utils.$isValid(infoMsg) ? { info: infoMsg } : null;
    SendResponse.sendResponse({
      status: 403,
      message: resMsg,
      data: resData,
      response: res,
    });
  }

  static sessionTimedOut({ res, resMsg, infoMsg } = {}) {
    const resData = Utils.$isValid(infoMsg) ? { info: infoMsg } : null;
    res.status(401);
    SendResponse.sendResponse({
      status: 401,
      message: resMsg,
      data: resData,
      response: res,
    });
  }
}
