/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const axios = require("axios");

export default class Aws {
  // --------------------------------------------------------------------------------------------
  // -------------------------------- AWS SERVICE FUNCTIONS -------------------------------------
  // --------------------------------------------------------------------------------------------

  static async getS3Client() {
    const [region, accessKeyId, secretAccessKey] = await Promise.all([
      AzureVault.getSecret("awsRegion"),
      AzureVault.getSecret("awsCredentialsAccessKeyId"),
      AzureVault.getSecret("awsCredentialsSecretAccessKey"),
    ]);
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  static async uploadFile({ fileName, fileStream, bucketName, fileType } = {}) {
    if (!Utils.$isValid(fileName) || !Utils.$isValid(fileStream)) {
      return null;
    }
    const s3Client = await Aws.getS3Client();
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream,
      ContentType: Utils.$isValid(fileType) ? fileType : "image/jpeg",
      ContentLength: fileStream.length,
    };
    try {
      const uploadCommand = new PutObjectCommand(params);
      await s3Client.send(uploadCommand);
      const awsRegion = await AzureVault.getSecret("awsRegion");
      const uploadedUrl = `https://${bucket}.s3.${awsRegion}.amazonaws.com/${fileName}`;
      logger.debug("File uploaded successfully:", uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      logger.error("Error uploading File to S3:", error);
      throw error;
    }
  }

  static async deleteFile({ fileName, bucketName } = {}) {
    if (!Utils.$isValidString(fileName) || !Utils.$isValid(bucketName)) {
      return false;
    }
    let fileId = fileName;
    if (fileName.startsWith("https://")) {
      fileId = await Utils.$getFileNameFromURL({ fileURL: fileName });
    }
    const s3Client = await Aws.getS3Client();
    const params = {
      Bucket: bucketName,
      Key: fileId,
    };
    const isFileExisting = await Aws.isFileExisting({
      fileName: fileId,
      bucketName,
    });
    if (isFileExisting) {
      try {
        const deleteCommand = new DeleteObjectCommand(params);
        await s3Client.send(deleteCommand);
        logger.debug(`"${fileName}" deleted from S3.`);
        return true;
      } catch (error) {
        logger.error(`Error deleting ${fileName} from S3: `, error);
        return false;
      }
    }
    return false;
  }

  static async isFileExisting({ fileName, bucketName } = {}) {
    if (!Utils.$isValidString(fileName) || !Utils.$isValid(bucketName)) {
      return false;
    }
    let fileId = fileName;
    if (fileName.startsWith("https://")) {
      fileId = await Utils.$getFileNameFromURL({ fileURL: fileName });
    }
    const s3Client = await Aws.getS3Client();
    const params = { Bucket: bucketName, Key: fileId };
    try {
      const fileCheckCommand = new HeadObjectCommand(params);
      await s3Client.send(fileCheckCommand);
      logger.debug(`"${fileId}" found in S3.`);
      return true;
    } catch (error) {
      logger.error(`${fileId} not found in S3: `, error);
      return false;
    }
  }

  static async getMetaData({ url } = {}) {
    if (!Utils.$isValid(url) || !url.startsWith("https://")) {
      return null;
    }
    const fileName = url.split("amazonaws.com/").pop();
    if (!Utils.$isValid(fileName)) return null;
    const response = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
    });
    if (response.status == 200 && response.statusText == "OK") {
      return {
        name: fileName,
        buffer: Buffer.from(response.data),
        contentType: response.headers["content-type"],
      };
    }
    return null;
  }
}
