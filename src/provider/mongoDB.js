/* eslint-disable */
const mongoose = require("mongoose");

class MongoDB {
  static async connect() {
    try {
      await mongoose.connect(process.env.MONGO_CNXN_STRING);
    } catch (error) {
      console.error("Error while connecting to MongoDB : ", error);
    }
    return;
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.info("Error while disconnecting from MongoDB : ", error);
    }
    return;
  }
}

module.exports = MongoDB;