/* eslint-disable */
import moment from "moment";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

class Logger {
  constructor() {
    let transports = [];
    const dailyTransport = new DailyRotateFile({
      filename: "logs/orbit-backend-%DATE%.log",
      datePattern: "DD-MM-YYYY",
      zippedArchive: true,
      maxFiles: "7d",
    });
    transports.push(dailyTransport);
    const dailyErrTransport = new DailyRotateFile({
      filename: "logs/orbit-backend-%DATE%-error.log",
      datePattern: "DD-MM-YYYY",
      zippedArchive: true,
      maxFiles: "7d",
      level: "error",
    });
    transports.push(dailyErrTransport);
    const customFormat = winston.format.printf(
      (info) => `${info.timestamp} [${info.level}] :: ${info.message}`
    );
    const appendTimestamp = winston.format((info) => {
      info.timestamp = moment()
        .utcOffset("+05:30")
        .format("DD-MM-YYYY HH:mm:ss");
      return info;
    });
    this.log = winston.createLogger({
      format: winston.format.combine(appendTimestamp(), customFormat),
      level: "info",
      transports,
    });
    this.log.info("Logger started.");
    this.log.error("Error logs.");
  }
}

export default new Logger().log;
