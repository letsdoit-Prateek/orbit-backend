/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
import Db from "./db";
const twilio = require("twilio");

export default class WhatsAppSender {
  static async getWhatsAppConfig() {
    const [
      phoneNo,
      accountId,
      token,
      kidsTestTemplateId,
      kidsTestCouponCode,
      kidsTestRedirectUrl,
    ] = await Promise.all([
      AzureVault.getSecret("whatsAppCredentialsPhoneNo"),
      AzureVault.getSecret("whatsAppCredentialsAccountId"),
      AzureVault.getSecret("whatsAppCredentialsToken"),
      AzureVault.getSecret("whatsAppCredentialsKidsTestTemplateId"),
      AzureVault.getSecret("whatsAppCredentialsKidsTestCouponCode"),
      AzureVault.getSecret("whatsAppCredentialsKidsTestRdirectUrl"),
    ]);
    const whatsAppConfig = {
      credentials: {
        phoneNo,
        accountId,
        token,
      },
      kidsTest: {
        templateId: kidsTestTemplateId,
        couponCode: kidsTestCouponCode,
        redirectUrl: kidsTestRedirectUrl,
      },
    };
    const client = twilio(
      whatsAppConfig.credentials.accountId,
      whatsAppConfig.credentials.token
    );
    return { whatsAppConfig: whatsAppConfig, client: client };
  }

  static async sendKidsTestMessage({ name, phoneNumber, reportURL } = {}) {
    const whatsAppDetails = await this.getWhatsAppConfig();
    const kidsTestConfig = whatsAppDetails.whatsAppConfig.kidsTest;
    let params = [];
    params.push({
      name: "whatsAppTemplateId",
      value: kidsTestConfig.templateId,
    });
    params.push({ name: "couponCode", value: kidsTestConfig.couponCode });
    params.push({ name: "url", value: kidsTestConfig.redirectUrl });
    params.push({ name: "name", value: name });
    params.push({ name: "testReportUrl", value: reportURL });
    const result = await Db.instance().execute("ReplaceWhatsAppText", params);
    if (!Utils.$isValidArray(result[0]) || !Utils.$isValidJson(result[0][0]))
      return false;
    const whatsAppParams = {
      body: result[0][0].ReplacedWhatsAppText,
      from: "whatsapp:" + whatsAppDetails.whatsAppConfig.credentials.phoneNo,
      to: "whatsapp:" + "+91" + phoneNumber,
    };
    try {
      await whatsAppDetails.client.messages.create(whatsAppParams);
      logger.debug("WhatsApp message sent successfully!");
    } catch (error) {
      logger.error("Unable to send whatsapp message to: ", phoneNumber);
      return false;
    }
    return true;
  }

  static async sendMessage({ text, phoneNumber } = {}) {
    const whatsAppDetails = await this.getWhatsAppConfig();
    if (!Utils.$isValid(text) || !Utils.$isValid(phoneNumber)) {
      return false;
    }
    const whatsAppParams = {
      body: text,
      from: "whatsapp:" + whatsAppDetails.whatsAppConfig.credentials.phoneNo,
      to: "whatsapp:" + "+91" + phoneNumber,
    };
    const response =
      await whatsAppDetails.client.messages.create(whatsAppParams);
    logger.debug(
      `WhatsApp message successfully sent to ${phoneNumber}: ${response}.`
    );
    return response;
  }
}
