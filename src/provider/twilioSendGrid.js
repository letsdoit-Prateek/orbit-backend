/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const sgMail = require("@sendgrid/mail");
const baseConfig = require("../config/baseConfig.json");

export default class TwilioSendGrid {
  static async sendEmail({
    from = baseConfig.sendGridConfig.from,
    fromName = baseConfig.sendGridConfig.fromName,
    to,
    subject,
    text = null,
    html = null,
    attachments = null,
  } = {}) {
    if (!Utils.$isValid(to) || !Utils.$isValid(subject)) return false;

    // Fetch the api key and set
    const apiKey = await AzureVault.getSecret("sendGridApiKey");
    sgMail.setApiKey(apiKey);

    // Email params
    let emailParams = {
      from: { name: fromName, email: from },
      to: to,
      subject: subject,
      custom_args: { subject: subject },
    };

    // Adds text body to email
    if (Utils.$isValid(text)) Object.assign(emailParams, { text: text });

    // Adds html to email
    if (Utils.$isValid(html)) Object.assign(emailParams, { html: html });

    // Attachments
    if (Utils.$isValidArray(attachments)) {
      const sendGridAttachments = this.processAttachments({ attachments });
      Object.assign(emailParams, { attachments: sendGridAttachments });
    }

    // Send email
    try {
      const response = await sgMail.send(emailParams);
      return response?.[0]?.statusCode == baseConfig.sendGridConfig.successCode;
    } catch (error) {
      logger.error(
        `Unable to send email to: ${to}. Failed with error: ${error}`
      );
      return false;
    }
  }

  static processAttachments({ attachments } = {}) {
    /* This function will process the attachments acc to send grid and
      the attachments array should look like below provided format
      [{ fileStream: "<fileBuffer>", fileName: "<nameOfTheFile>" }]
      sendgrid is only able to send content when converted to
      base64 string.
    */
    let sendGridAttachments = Array();
    if (!Utils.$isValidArray(attachments)) return sendGridAttachments;
    attachments.forEach((attachment) => {
      sendGridAttachments.push({
        content: attachment.fileStream.toString("base64"),
        filename: attachment.fileName,
        type: Utils.$getContentType(
          attachment.fileName.split(".").pop().toLowerCase()
        ),
        disposition: "attachment",
      });
    });
    return sendGridAttachments;
  }
}
