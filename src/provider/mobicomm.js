/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const axios = require("axios");

export default class Mobicomm {
  static async getMobicommConfig() {
    const [url, user, key, senderId, accusage, entityId] = await Promise.all([
      AzureVault.getSecret("mobiCommUrl"),
      AzureVault.getSecret("mobiCommUser"),
      AzureVault.getSecret("mobiCommKey"),
      AzureVault.getSecret("mobiCommSenderId"),
      AzureVault.getSecret("mobiCommAccusage"),
      AzureVault.getSecret("mobiCommEntityId"),
    ]);
    const mobiConfig = {
      url,
      user,
      key,
      senderId,
      accusage,
      entityId,
    };
    return mobiConfig;
  }

  static async sendSms({ message, tempId, mobileNo } = {}) {
    if (!Utils.$isValid(message) || !Utils.$isValid(mobileNo)) return false;
    const mobiConfig = await this.getMobicommConfig();
    const params = {
      user: mobiConfig.user,
      key: mobiConfig.key,
      mobile: mobileNo,
      message: encodeURIComponent(message),
      senderid: mobiConfig.senderId,
      accusage: mobiConfig.accusage,
      entityid: mobiConfig.entityId,
      tempid: tempId,
    };
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const mobiComApiUrl = `${mobiConfig.url}?${queryString}`;
    try {
      const response = await axios.get(mobiComApiUrl);
      if (response.status == 200) {
        logger.debug(`${Utils.$getDateTime()} || SMS sent successfully.`);
        return true;
      }
    } catch (err) {
      logger.error(`${Utils.$getDateTime()} || Unable to send SMS.`);
      return false;
    }
  }
}
