/* eslint-disable */
import AzureVault from "./azureVault";
const axios = require("axios");

export default class Microsoft {
  static async getConfig() {
    return { tenantId: await AzureVault.getSecret("msteamstenantId") };
  }

  static async getAccessToken({
    clientId,
    clientSecret,
    refreshToken,
    scope,
    redirectUrl = "http://localhost:3000/redirect",
  } = {}) {
    const msConfig = await this.getConfig();
    const tokenEndpoint = `https://login.microsoftonline.com/${msConfig.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: redirectUrl,
      scope: scope,
    });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const response = await axios.post(tokenEndpoint, params, { headers });
    return response?.data?.access_token;
  }
}
