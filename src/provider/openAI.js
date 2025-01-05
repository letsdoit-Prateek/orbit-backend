/* eslint-disable */
import OpenAI from "openai";
import logger from "../util/logger";
import Utils from "../util/utils";
import AzureVault from "./azureVault";

export default class OpenAi {
  static async getOpenAIClient() {
    return new OpenAI({ apiKey: await AzureVault.getSecret("openAIApikey") });
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
      // Get openAI client
      const openAIClient = await this.getOpenAIClient();

      // Get the openAI model
      const model = await AzureVault.getSecret("openAIModel");

      // Fetch the response for the prompts
      logger.debug("Fetching response from openAI...");
      const completionResponse = await openAIClient.chat.completions.create({
        messages,
        model,
        temperature,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        max_tokens: maxTokens,
      });

      logger.debug("Fetched the response from openAI!");
      return completionResponse?.choices?.[0]?.message?.content;
    } catch (error) {
      logger.error(`Error while fetching response from openAI:${error}`);
      return null;
    }
  }
}
