/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const axios = require("axios");
const FormData = require("form-data");

export default class Mfit {
  static async getMfitConfig() {
    const [baseUrl, apiKey] = await Promise.all([
      AzureVault.getSecret("ecasBaseUrl"),
      AzureVault.getSecret("ecasApiKey"),
    ]);
    return { baseUrl, apiKey };
  }

  // Function which parse the PDF ECAS file and returns Excel file
  static async processEcas({ ecasFile, password } = {}) {
    let resultObj = { data: null, errorlogs: [] };
    if (!Utils.$isValidJson(ecasFile) || !Utils.$isValidString(password))
      return resultObj;
    let response;
    const ecasConfing = await this.getMfitConfig();
    const formData = new FormData();
    formData.append("file", ecasFile.buffer, {
      filename: ecasFile.originalname,
    });
    formData.append("password", password);
    const mfitApiConfig = {
      method: "post",
      url: `${ecasConfing.baseUrl}?apiKey=${ecasConfing.apiKey}`,
      headers: { ...formData.getHeaders() },
      data: formData,
      responseType: "arraybuffer",
    };
    const errorStmt = "Unable to process the ecas statement";
    try {
      // Fetch response from MFIT
      response = await axios(mfitApiConfig);
    } catch (err) {
      logger.error("Unable to fetch response from MFIT, Error: ", err);
      resultObj.errorlogs.push(errorStmt);
      return resultObj;
    }
    if (response?.status !== 200) {
      logger.error("Invalid response from mfit.");
      resultObj.errorlogs.push(errorStmt);
      return resultObj;
    }
    resultObj.data = response?.data;
    return resultObj;
  }
}
