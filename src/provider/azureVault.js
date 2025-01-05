/* eslint-disable */
import Utils from "../util/utils";
import AzureRedis from "./azureRedis";
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

export default class AzureVault {
  static getClient(vaultName = `${process.env.KEY_VAULT_NAME}`) {
    const credential = new DefaultAzureCredential({
      exclude_environment_credential: true,
      exclude_managed_identity_credential: false,
      exclude_visual_studio_code_credential: true,
      exclude_cli_credential: false,
      exclude_interactive_browser_credential: false,
    });
    const vaultUrl = `https://${vaultName}.vault.azure.net/`;
    return new SecretClient(vaultUrl, credential);
  }

  static async getSecret(name, vault) {
    const cachedValue = await AzureRedis.getValue(name);
    if (Utils.$isValid(cachedValue)) return cachedValue;
    const azureClient = AzureVault.getClient(vault);
    const data = await azureClient.getSecret(name);
    AzureRedis.setValue({ key: name, value: data["value"] });
    return data["value"];
  }

  static async setSecret(name, value, vault) {
    const azureClient = AzureVault.getClient(vault);
    const result = await azureClient.setSecret(name, value);
    AzureRedis.setValue({ key: name, value: value });
    return result;
  }
}
