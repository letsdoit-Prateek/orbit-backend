/* eslint-disable */
import OptimumEncryption from "../util/encryption/optimumEncryption";
import Logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const axios = require("axios");

/*
  Optimum financial solutions - (OFS).
  A 3rd party Mutual Fund Distributor.
*/
export default class Optimum {
  static async getOfsConfig() {
    const [
      baseUrl,
      authEndPoint,
      authString,
      dummyPassword,
      dummyUserType,
      dummyIpAdd,
      dummyPanCardSuffix,
    ] = await Promise.all([
      AzureVault.getSecret("ofsBaseUrl"),
      AzureVault.getSecret("ofsAuthEndPoint"),
      AzureVault.getSecret("ofsAuthenticationString"),
      AzureVault.getSecret("ofsDummyPsswd"),
      AzureVault.getSecret("ofsDummyUserType"),
      AzureVault.getSecret("ofsDummyIpAdd"),
      AzureVault.getSecret("ofsDummyPanCardSuffix"),
    ]);
    return {
      baseUrl,
      authEndPoint,
      authString,
      dummyPassword,
      dummyUserType,
      dummyIpAdd,
      dummyPanCardSuffix,
    };
  }

  static async getBaseClientAuth({ userPan } = {}) {
    let clientToken = null;
    try {
      if (!Utils.$isValid(userPan)) return clientToken;
      const ofsConfig = await Optimum.getOfsConfig();
      const ofsEndPoint = ofsConfig.baseUrl + ofsConfig.authEndPoint;
      const headers = {
        Authorization: ofsConfig.authString,
        "Content-Type": "application/json",
      };
      const requestBody = {
        USER_ID: await OptimumEncryption.encrypt(userPan),
        PWD: ofsConfig.dummyPassword,
        USER_TYPE: ofsConfig.dummyUserType,
        IPADDRESS: ofsConfig.dummyIpAdd,
      };
      const authresponse = await axios.post(ofsEndPoint, requestBody, {
        headers,
        timeout: 5000,
      });
      if (!Utils.$isValid(authresponse) || authresponse?.status !== 200) {
        Logger.error("Invalid response from Optimum.");
        return clientToken;
      }
      clientToken = Utils.$isValid(authresponse?.data?.TOKEN_ID)
        ? authresponse.data.TOKEN_ID +
          "@" +
          userPan +
          ofsConfig.dummyPanCardSuffix
        : null;
      Logger.debug("Ofs auth client token fetched successfully!");
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        Logger.error("Request timed out.");
      } else {
        Logger.error("Error while generating Optimum client token : ", error);
      }
    }
    return clientToken;
  }
}
