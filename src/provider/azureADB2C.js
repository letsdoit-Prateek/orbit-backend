/* eslint-disable */
import baseConfig from "../config/baseConfig.json";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

export default class AzureADB2C {
  static async adb2cConfigDetails() {
    const b2cConfig = baseConfig.azureAdb2c;
    const [tenantId, tenantName, clientId, clientSecret, policyName] =
    await Promise.all([
      AzureVault.getSecret("azureADB2cCredentialsTenantId"),
      AzureVault.getSecret("azureADB2cCredentialsTenantName"),
      AzureVault.getSecret("azureADB2cCredentialsClientId"),
      AzureVault.getSecret("azureADB2cCredentialsClientSecret"),
      AzureVault.getSecret("azureADB2cPoliciePolicyName"),
    ]);
    const adb2cConfig = {
      credentials: { tenantId, tenantName, clientId, clientSecret },
      policies: { policyName },
      resource: {
        scope: b2cConfig.scope,
      },
      metadata: {
        authority: b2cConfig.metadata.authority,
        discovery: b2cConfig.metadata.discovery,
        version: b2cConfig.metadata.version,
      },
      settings: {
        isB2C: b2cConfig.settings.isB2C,
        validateIssuer: b2cConfig.settings.validateIssuer,
        passReqToCallback: b2cConfig.settings.passReqToCallback,
        loggingLevel: b2cConfig.settings.loggingLevel,
      },
    };
    return adb2cConfig;
  }

  static async getConfig() {
    const adb2cConfig = await this.adb2cConfigDetails();
    let metaDataUrl = `https://${adb2cConfig.credentials.tenantName}.b2clogin.com/${adb2cConfig.credentials.tenantName}.onmicrosoft.com/${adb2cConfig.policies.policyName}/${adb2cConfig.metadata.version}/${adb2cConfig.metadata.discovery}`;
    return {
      identityMetadata: metaDataUrl,
      clientID: adb2cConfig.credentials.clientId,
      audience: adb2cConfig.credentials.clientId,
      policyName: adb2cConfig.policies.policyName,
      isB2C: adb2cConfig.settings.isB2C,
      validateIssuer: adb2cConfig.settings.validateIssuer,
      loggingLevel: adb2cConfig.settings.loggingLevel,
      passReqToCallback: adb2cConfig.settings.passReqToCallback,
    };
  }

  static async getClient() {
    const adb2cConfig = await this.adb2cConfigDetails();
    const credential = new ClientSecretCredential(
      adb2cConfig.credentials.tenantId,
      adb2cConfig.credentials.clientId,
      adb2cConfig.credentials.clientSecret
    );
    const options = { scopes: [".default"] };
    const authProvider = new TokenCredentialAuthenticationProvider(
      credential,
      options
    );
    return Client.initWithMiddleware({ authProvider });
  }

  static async fetchLoginDetails({ authInfo } = {}) {
    const b2cClient = await AzureADB2C.getClient();
    const userDetails = await b2cClient.api("/users/" + authInfo.oid).select("identities").get();
    if (
      !Utils.$isValid(userDetails) ||
      !Utils.$isValidArray(userDetails.identities)
    )
      return null;
    return await AzureADB2C.getMobileNo({ userDetails: userDetails.identities });
  }

  static async getMobileNo({ userDetails } = {}) {
    const adb2cConfig = await this.adb2cConfigDetails();
    if (!Utils.$isValid(adb2cConfig) || !Utils.$isValidArray(userDetails))
      return null;
    const signInType = "phoneNumber";
    const userCredential = userDetails.filter(
      (credential) => credential.signInType === signInType
    );
    if (
      !Utils.$isValid(userCredential) ||
      !Utils.$isValid(userCredential[0].issuerAssignedId)
    )
      return null;
    return userCredential[0].issuerAssignedId;
  }
}
