/* eslint-disable */
import Logger from "../util/logger";
const redis = require("redis");

export default class AzureRedis {
  static getClient() {
    return redis.createClient({
      url: `rediss://${process.env.CACHE_HOST_NAME}:${process.env.CACHE_PORT}`,
      password: `${process.env.CACHE_PSSWD}`,
      socket: { tls: true },
    });
  }

  static async getValue(key) {
    const redisClient = this.getClient();
    await redisClient.connect();
    const value = await redisClient.get(key);
    redisClient.disconnect();
    return value;
  }

  static async setValue({ key, value } = {}) {
    const redisClient = this.getClient();
    await redisClient.connect();
    const response = await redisClient.set(key, value);
    redisClient.disconnect();
    return response === "OK";
  }

  static async deleteKey(key) {
    if (!key) {
      throw new Error("Key must be provided");
    }
    const redisClient = this.getClient();
    let isSuccess = false;
    try {
      await redisClient.connect();
      const response = await redisClient.del(key);
      isSuccess = response > 0;
    } catch (error) {
      Logger.error("Error deleting key:", error);
    } finally {
      await redisClient.disconnect();
    }
    return isSuccess;
  }

  static async flushAllKeys() {
    let isFlushed = false;
    const redisClient = this.getClient();
    try {
      await redisClient.connect();
      let cursor = 0;
      do {
        const result = await redisClient.scan(cursor);
        cursor = result.cursor;
        const keys = result.keys;
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== 0);
    } catch (error) {
      Logger.error("Error clearing keys from azure cache for redis:", error);
    } finally {
      redisClient.disconnect();
    }
    return isFlushed;
  }
}
