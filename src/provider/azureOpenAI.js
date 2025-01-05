/* eslint-disable */
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

export default class AzureOpenAI {
  static async getAzrueOpenAIClient() {
    const [azOpenAIEndPoint, azOpenAIApiKey] = await Promise.all([
      AzureVault.getSecret("azureOpenAIEndPoint"),
      AzureVault.getSecret("azureOpenAIAPIKey"),
    ]);
    return new OpenAIClient(
      azOpenAIEndPoint,
      new AzureKeyCredential(azOpenAIApiKey)
    );
  }

  static async getResponse({
    messages,
    temperature,
    frequencyPenalty,
    presencePenalty,
    maxTokens,
  } = {}) {
    if (!Utils.$isValidArray(messages)) {
      logger.error("Prompt/Messages are not valid!");
      return null;
    }
    try {
      // Get azure openAI client
      const azureOpenAIClient = await this.getAzrueOpenAIClient();

      // Get the openAI model
      const model = await AzureVault.getSecret("openAIModel");

      // Fetch the response for the prompts
      logger.debug("Fetching response from azure openAI...");
      const azOpenAIResponse = await azureOpenAIClient.getChatCompletions(
        model,
        messages,
        { temperature, frequencyPenalty, presencePenalty, maxTokens }
      );

      logger.debug("Fetched the response from azure openAI!");
      return azOpenAIResponse?.choices?.[0]?.message?.content;
    } catch (error) {
      logger.error(`Error while fetching response from azure openAI:${error}`);
      return null;
    }
  }
}
