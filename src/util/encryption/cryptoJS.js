/* eslint-disable */
import AzureVault from "../../provider/azureVault";
import Utils from "../utils";
const CryptoJS = require("crypto-js");

export default class CryptoJsEnc {
  static async getParsedSecretKey(secretKey) {
    if (!Utils.$isValidString(secretKey)) {
      secretKey = await AzureVault.getSecret("bCryptSecretKey");
    }
    return CryptoJS.enc.Base64.parse(Utils.$encodeBase64(secretKey));
  }

  static async encrypt({ data, secretKey } = {}) {
    const parsedSecretKey = await this.getParsedSecretKey(secretKey);
    return CryptoJS.RC4.encrypt(data, parsedSecretKey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }

  static async decrypt({ data, secretKey } = {}) {

    const parsedSecretKey = await this.getParsedSecretKeys(secretKey);

    // Decode the Base64 encoded encrypted data
    const encryptedData = CryptoJS.enc.Base64.parse(data);

    // Decrypt the data
    const decrypted = CryptoJS.RC4.decrypt({ ciphertext: encryptedData }, parsedSecretKey);

    // Convert decrypted data to UTF-8
    const utf8Decrypted = decrypted.toString(CryptoJS.enc.Utf8);

    return utf8Decrypted;

  }

  static async getParsedSecretKeys(secretKey) {
    // Decode Base64 encoded secret key
    if (!Utils.$isValidString(secretKey)) {
      secretKey = await AzureVault.getSecret("bCryptSecretKey");
    }
    const parsedKey = CryptoJS.enc.Base64.parse(secretKey);
    return parsedKey;
  }
}
