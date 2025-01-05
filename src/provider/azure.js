/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const { BlobServiceClient } = require("@azure/storage-blob");

export default class Azure {
  // --------------------------------------------------------------------------------------------
  // -------------------------------- AZURE SERVICE FUNCTIONS -----------------------------------
  // --------------------------------------------------------------------------------------------

  static async getAzureClient() {
    const cnxnString = await AzureVault.getSecret("azureCnxnString");
    return BlobServiceClient.fromConnectionString(cnxnString);
  }

  static async uploadFile({
    fileName,
    fileStream,
    fileType,
    containerName,
  } = {}) {
    if (!Utils.$isValid(fileName) || !Utils.$isValid(fileStream)) {
      return null;
    }
    try {
      const azureClient = await Azure.getAzureClient();
      const containerClient = azureClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(fileName);
      await blobClient.upload(fileStream, fileStream.length, {
        overwrite: true,
        blobHTTPHeaders: {
          blobContentType: Utils.$isValid(fileType)
            ? fileType
            : Utils.$getContentType(fileName.split(".").pop()),
        },
      });
      const uploadedUrl = blobClient.url;
      logger.debug("File uploaded successfully:", uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      logger.error(`Error while uploading file to azure container: ${error}`);
      return null;
    }
  }

  static async deleteFile({ fileName, containerName } = {}) {
    if (!Utils.$isValidString(fileName) || !Utils.$isValid(containerName)) {
      return false;
    }
    try {
      let fileId = fileName;
      if (fileName.startsWith("https://")) {
        fileId = await Utils.$getFileNameFromURL({ fileURL: fileName });
      }
      const azureClient = await Azure.getAzureClient();
      const containerClient = azureClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(fileId);
      const params = { deleteSnapshots: "include" }; // or 'only'
      await blobClient.deleteIfExists(params);
      logger.debug(`"${fileName}" deleted from azure container.`);
      return true;
    } catch (error) {
      logger.error(`Error deleting ${fileName} from azure container: `, error);
    }
    return false;
  }
}
