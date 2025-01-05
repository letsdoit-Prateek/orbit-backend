/* eslint-disable */
import axios from "axios";
import base64url from "base64url";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import emailvalidator from "email-validator";
import exceljs from "exceljs";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import moment from "moment";
import momentTimeZone from "moment-timezone";
import sql from "mssql";
import { Readable } from "stream";
import validator from "validator";
import AzureVault from "../provider/azureVault.js";
import Db from "../provider/db";
import logger from "./logger.js";
const baseConfig = require("../config/baseConfig.json");

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

  static $checkRowsUpdated(jsonObj, key, noOfRows = 1) {
    return (
      Utils.$isValidJson(jsonObj) &&
      Utils.$convertToInt(jsonObj[key]) === noOfRows
    );
  }

  static $isValidKey(jsonObj, key) {
    return (
      Utils.$isValidJson(jsonObj) &&
      key in jsonObj &&
      Object.hasOwn(jsonObj, key)
    );
  }

  static $hasNulls(array, strict = false) {
    if (strict) {
      return (
        !Array.isArray(array) ||
        array.length === 0 ||
        array.some((variable) => !Utils.$isValidString(variable))
      );
    } else {
      return (
        !Array.isArray(array) ||
        array.length === 0 ||
        array.some((variable) => !Utils.$isValid(variable))
      );
    }
  }

  static $getCleanString(string) {
    return Utils.$isValidString(string)
      ? string
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\./g, "")
          .replace(/\s+/g, "")
          .replace(" ", "")
          .trim()
      : null;
  }

  static $isEqualArrays(array1, array2) {
    let sortedArr1;
    let sortedArr2;
    if (
      !Utils.$isValidArray(array1) ||
      !Utils.$isValidArray(array2) ||
      array1.length !== array2.length
    ) {
      return false;
    }
    sortedArr1 = array1.slice().sort();
    sortedArr2 = array2.slice().sort();
    return sortedArr1.every((element, index) => element === sortedArr2[index]);
  }

  static $generateUUID() {
    return Math.random().toString(36).substring(2, 9);
  }

  static async $encryptString(string, secretKey) {
    const encryptionKeySecret = await AzureVault.getSecret(
      "encryptionKeySecret"
    );
    const encryptionKey = Utils.$isValid(secretKey)
      ? secretKey
      : encryptionKeySecret;
    return Utils.$isValidString(string) && Utils.$isValidString(encryptionKey)
      ? CryptoJS.AES.encrypt(string, encryptionKey).toString()
      : null;
  }

  static async $decryptString(string, secretKey) {
    const encryptionKeySecret = await AzureVault.getSecret(
      "encryptionKeySecret"
    );
    const encryptionKey = Utils.$isValid(secretKey)
      ? secretKey
      : encryptionKeySecret;
    return Utils.$isValid(string) && Utils.$isValidString(encryptionKey)
      ? CryptoJS.AES.decrypt(string, encryptionKey).toString(CryptoJS.enc.Utf8)
      : null;
  }

  static async $aesEncrypt({ value, aesSecretKey } = {}) {
    if (!Utils.$isValidString(aesSecretKey))
      aesSecretKey = await AzureVault.getSecret("aesSecretKey");
    // Use the first 4 words (= 16 bytes) of the hash as the AES key
    const encryptedKey = CryptoJS.lib.WordArray.create(
      CryptoJS.SHA1(`${aesSecretKey}`).words.slice(0, 16 / 4)
    );
    const payload = Buffer.from(value).toString("utf-8");
    const encryptedBytes = CryptoJS.AES.encrypt(payload, encryptedKey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encryptedBytes.toString();
  }

  static async $aesDecrypt({ encryptedValue, aesSecretKey } = {}) {
    if (!Utils.$isValidString(aesSecretKey))
      aesSecretKey = await AzureVault.getSecret("aesSecretKey");
    // Use the first 4 words (= 16 bytes) of the hash
    const encryptedKey = CryptoJS.lib.WordArray.create(
      CryptoJS.SHA1(`${aesSecretKey}`).words.slice(0, 16 / 4)
    );
    const bytes = CryptoJS.AES.decrypt(encryptedValue, encryptedKey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static async $getParamsFromArgs(args) {
    return await Utils.$getParamsFromObj(args[0]);
  }

  static async $getExcludedParamsFromArgs(args, excludeKeys = []) {
    return await Utils.$getExcludedParamsFromObj(args[0], excludeKeys);
  }

  static $isValidImgExt(extension) {
    return (
      Utils.$isValid(extension) &&
      baseConfig.standardImgFormats.includes(extension)
    );
  }

  static $capitalize(string) {
    if (!Utils.$isValidString(string)) {
      return null;
    }
    if (string.length === 1) {
      return string.toUpperCase();
    }
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  static async $getParamsFromObj(obj) {
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
  }

  static async $getExcludedParamsFromObj(obj, excludeKeys = []) {
    return Object.entries(obj)
      .filter(([name]) => !excludeKeys.includes(name))
      .map(([name, value]) => ({ name, value }));
  }

  static async $getImageStreamFromBase64({ base64String } = {}) {
    let buffer = Buffer.from(base64String, "base64");
    const bufferLength = buffer.length;
    const imgStream = new Readable({
      read(size) {
        if (Utils.$isValidString(buffer)) {
          this.push(buffer);
          buffer = Buffer.alloc(0);
        } else {
          this.push(null);
        }
      },
    });
    return { imageStream: imgStream, contentLength: bufferLength };
  }

  static async $generateFileName({
    imageId,
    imageType = "image",
    randomize = false,
    onlyBlobName = false,
    extension = "jpg",
  } = {}) {
    let blobName = Utils.$isValid(imageId)
      ? `${imageType}_${imageId}`
      : imageType;
    blobName = randomize ? `${blobName}_${Utils.$generateUUID()}` : blobName;
    return onlyBlobName ? blobName : `${blobName}.${extension}`;
  }

  static async $getFileNameFromURL({ fileURL } = {}) {
    if (!Utils.$isValidString(fileURL) || !fileURL.startsWith("https://")) {
      return null;
    }
    const URLParts = fileURL.split("/");
    return URLParts[URLParts.length - 1];
  }

  static $getIST({ format = "YYYY-MM-DDTHH:mm:ss" } = {}) {
    return momentTimeZone.tz(moment(), Utils.timeZone).format(format);
  }

  static $getDateTime({ timeInput, format = "DD-MM-YYYY HH:mm:ss" } = {}) {
    if (Utils.$isValid(timeInput)) {
      return moment(timeInput).format(format);
    }
    return Utils.$getIST({ format: format });
  }

  static $get24HrBufferDatetime(inputDatetime) {
    const inputDate =
      inputDatetime instanceof Date ? inputDatetime : new Date(inputDatetime);
    const currentDate = new Date(Utils.$getIST());

    const twentyFourHrsBef = new Date(inputDate);
    twentyFourHrsBef.setHours(inputDate.getHours() - 24);

    return twentyFourHrsBef < currentDate
      ? currentDate.setMinutes(currentDate.getMinutes() + 5)
      : twentyFourHrsBef;
  }

  static async $getTemplateText({ params, templateId, db } = {}) {
    if (!Utils.$isValid(templateId)) return false;
    if (!db) db = await Db.instance();
    let templateText = null;
    if (Utils.$isValid(params)) {
      if (!Utils.$isValidJson(params)) params = JSON.parse(params);
      const paramTable = new sql.Table();
      paramTable.columns.add("Parameter", sql.NVarChar);
      paramTable.columns.add("Value", sql.NVarChar);
      Object.entries(params).forEach(([param, value]) => {
        paramTable.rows.add(`@${param}`, value);
      });
      const templateData = await db.execute("GetTemplateText", [
        { name: "templateId", value: templateId },
        { name: "params", value: paramTable },
      ]);
      templateText = Utils.$isValidArray(templateData)
        ? templateData[0]?.[0]?.templateText
        : null;
    } else {
      const rawTemplateData = await db.query(
        "SELECT TemplateText FROM [dbo].[MLTemplate] WHERE TemplateID=?",
        [templateId]
      );
      templateText = Utils.$isValidArray(rawTemplateData)
        ? rawTemplateData[0]?.TemplateText
        : null;
    }
    return templateText;
  }

  // TODO: Replace this function with getTemplateMetaData
  static async $getTemplateSubject({ templateId, db } = {}) {
    if (!Utils.$isValid(templateId)) return null;
    if (!db) db = await Db.instance();
    const result = await db.query(
      "SELECT TOP 1 TemplateSubject FROM [dbo].[MLTemplate] WHERE TemplateId=?",
      [templateId],
      true
    );
    return result?.TemplateSubject;
  }

  static async $getTemplateMetaData({ templateId, db } = {}) {
    if (!Utils.$isValid(templateId)) return null;
    if (!db) db = await Db.instance();
    const result = await db.query(
      "SELECT * FROM [dbo].[MLTemplate] WHERE TemplateId=?",
      [templateId],
      true
    );
    return Utils.$isValidJson(result) ? result : null;
  }

  static async $getTemplateMetaDataByCode({ templateCode, db } = {}) {
    if (!Utils.$isValid(templateCode)) return null;
    if (!db) db = await Db.instance();
    const result = await db.query(
      "SELECT * FROM [dbo].[MLTemplate] WHERE TemplateCode=?",
      [templateCode],
      true
    );
    return Utils.$isValidJson(result) ? result : null;
  }

  static $getCamelCaseStr({ string, upperCase = false } = {}) {
    if (upperCase) {
      return `${string[0].toUpperCase()}${string.slice(1).toLowerCase()}`;
    }
    return `${string[0].toLowerCase()}${string.slice(1)}`;
  }

  static $replaceSingleQuotes(string, replaceParam = "'", replaceWith = "''") {
    return String(string).replace(replaceParam, replaceWith);
  }

  static async $getSysSettingByName(settingName) {
    const result = await Db.instance().query(
      "SELECT [Value] FROM [dbo].[MLSystemSetting] WHERE [SettingName]=?",
      [settingName],
      true
    );
    return Utils.$isValidJson(result) ? result : null;
  }

  static $formatDate(inputDate) {
    if (!Utils.$isValidString(inputDate)) return null;
    const dateParts = inputDate.split(/[-/]/);
    let year, month, day;
    if (dateParts[0].length === 4) {
      year = dateParts[0];
      month = dateParts[1];
      day = dateParts[2];
    } else {
      day = dateParts[0];
      month = dateParts[1];
      year = dateParts[2];
    }
    const formattedDate = new Date(`${year}-${month}-${day}`)
      .toISOString()
      .split("T")[0];
    return formattedDate;
  }

  static $generateOTP({ length = 6 } = {}) {
    const otpArray = Array.from({ length }, () =>
      Math.floor(Math.random() * 10)
    );
    return otpArray.join("");
  }

  static async $generateOtpShaHash() {
    const [packageName, sha1Cert] = await Promise.all([
      AzureVault.getSecret("otpHashPackageName"),
      AzureVault.getSecret("otpHashSha1Cert"),
    ]);
    const input = `${packageName} ${sha1Cert}`;
    const hash = crypto.createHash("sha256").update(input).digest();
    return base64url(hash).slice(0, 11);
  }

  static $isValidMobileNo(mobileNo) {
    return (
      Utils.$isValidString(mobileNo) &&
      mobileNo.length === 10 &&
      /^\+?\d+$/.test(mobileNo)
    );
  }

  static $isValidEmail(emailId) {
    return Utils.$isValidString(emailId) && emailvalidator.validate(emailId);
  }

  static $generateRandomStr(length = 16) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result.toUpperCase();
  }

  static $encodeBase64(str) {
    if (!Utils.$isValidString(str)) return null;
    return Buffer.from(str).toString("base64");
  }

  static $decodeBase64(encodedStr) {
    if (!Utils.$isValidString(encodedStr)) return null;
    return Buffer.from(encodedStr, "base64").toString("utf-8");
  }

  static $getMobileNumberWithoutPrefix(mobileNumber) {
    const phoneNumber = parsePhoneNumberFromString(mobileNumber);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.nationalNumber;
    }
    // Return original number if parsing fails or number is invalid
    return mobileNumber;
  }

  static $getContentType(extension) {
    if (!Utils.$isValidString(extension)) return null;
    extension = extension.toLowerCase();
    const contentTypeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      doc: "application/msword",
      html: "text/html",
      csv: "text/csv",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return contentTypeMap[extension] || "application/octet-stream";
  }

  static async $createExcelFile({
    data,
    sheetName,
    protect,
    unProtectedColumns,
  } = {}) {
    if (!Utils.$isValidArray(data)) return null;
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    data.forEach((row) => {
      const values = headers.map((header) => row[header]);
      worksheet.addRow(values);
    });
    if (Utils.$isValid(protect) && protect) {
      worksheet.protect();
      if (Utils.$isValidArray(unProtectedColumns)) {
        unProtectedColumns.forEach((columnName) => {
          const colIndex = headers.indexOf(columnName) + 1;
          if (colIndex > 0) {
            worksheet.getColumn(colIndex).protection = {
              locked: false,
            };
          }
        });
      }
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  static $sortArrayOfObj(array, key, order = "desc") {
    if (!Utils.$isValidArray(array)) return null;
    return order === "desc"
      ? array.sort((a, b) => b[key] - a[key])
      : array.sort((a, b) => a[key] - b[key]);
  }

  static $nullifyParams(params) {
    return params.map((param) => ({
      ...param,
      value: ["null", "", " ", "undefined", undefined].includes(param.value)
        ? null
        : param.value,
    }));
  }

  static $checkBoolString(str) {
    if (typeof str !== "string") return false;
    if (str.toLowerCase() === "true") return true;
    return false;
  }

  static async $getBufferFromURL({ url, responseType = "arraybuffer" } = {}) {
    if (!Utils.$isValid(url) || !url.toLowerCase().startsWith("http")) {
      return null;
    }
    try {
      const response = await axios({
        method: "GET",
        url,
        responseType: responseType,
      });
      if (Utils.$isValid(response) && response?.status == 200) {
        return Utils.$isValid(response?.data)
          ? Buffer.from(response.data)
          : null;
      }
    } catch (error) {
      logger.error(
        `Unable to get response from url: ${url}. Failed with error: ${error}.`
      );
    }
    return null;
  }

  static $isValidPassword(password) {
    // It checks for minimum 8 and maximum 64 chars and allows only @, #, $,
    // and does not include any other special characters including spaces
    const passwordPattern = /^(?=.*[A-Za-z])[\w@#$!%^&?.,<>'"|()%:;]{8,64}$/;
    if (!validator.isLength(password, { min: 8, max: 64 })) return false;
    return passwordPattern.test(password);
  }

  static $splitString(data, key = ",") {
    if (!Utils.$isValidString(data)) return [];
    const result = data.split(key);
    return result.map((item) => item.trim());
  }

  static $tryConvertToInt(variable) {
    if (!Utils.$isValidString(variable)) return null;
    const trimmedVariable = variable.trim().toLowerCase();
    const invalidValues = ["", "null", "undefined"];
    if (invalidValues.includes(trimmedVariable) || isNaN(variable)) {
      return null;
    }
    let intValue = null;
    try {
      intValue = parseInt(variable, 10);
    } catch (err) {
      logger.error(`Unable to convert to int - ${variable}`);
    }
    return intValue;
  }

  static $nullify(variable) {
    if (
      variable === null ||
      variable === undefined ||
      variable === "" ||
      variable === "null" ||
      variable === "undefined" ||
      (typeof variable === "string" && variable.trim() === "")
    ) {
      return null;
    }
    return variable;
  }

  static $JSONParse(data) {
    let parsedData = null;
    if (Utils.$isValid(data)) {
      try {
        parsedData = JSON.parse(data);
      } catch (err) {
        logger.error(`Unable to parse the data: ${data} with error: ${err}`);
      }
    }
    return parsedData;
  }

  static $JSONStringify(data) {
    let stringifyedData = null;
    if (Utils.$isValid(data)) {
      try {
        stringifyedData = JSON.stringify(data);
      } catch (err) {
        logger.error(
          `Unable to stringify the data: ${data} with error: ${err}`
        );
      }
    }
    return stringifyedData;
  }
}
