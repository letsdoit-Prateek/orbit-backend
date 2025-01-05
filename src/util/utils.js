/* eslint-disable */

export default class Utils {
  static timeZone = "Asia/Kolkata";

  static $isValid(variable) {
    return typeof variable !== "undefined" && variable !== null;
  }

  static $isValidString(variable) {
    return Utils.$isValid(variable) && variable.length > 0;
  }

  static $isValidInteger(variable) {
    return (
      !Number.isNaN(variable) &&
      parseInt(Number(variable)) === variable &&
      !Number.isNaN(parseInt(variable, 10))
    );
  }

  static $convertToInt(variable) {
    return Utils.$isValid(variable) ? parseInt(variable, 10) : null;
  }

  static $isValidArray(array) {
    return Utils.$isValid(array) && Array.isArray(array) && array.length > 0;
  }

  static $isValidJson(jsonObj) {
    return Utils.$isValid(jsonObj) && Object.keys(jsonObj)?.length > 0;
  }
}
