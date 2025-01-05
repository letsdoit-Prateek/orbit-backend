/* eslint-disable */
import context from "express-http-context";
import moment from "moment";
import mssql from "mssql";
import logger from "../util/logger";

let instance = null;
export default class Db {
  constructor() {
    if (!instance) {
      instance = this;
      this.pool = new mssql.ConnectionPool(process.env.DB_CNXN_STRING);
    }
  }

  static instance() {
    if (!instance) instance = new Db();
    return instance;
  }

  async transaction() {
    try {
      await this.pool.connect();
    } catch (error) {
      logger.log("Unable to connect to database with error: ", error);
      throw error;
    }
    return this.pool.transaction();
  }

  async query(sql, args = [], firstRow = false) {
    try {
      await this.pool.connect();
    } catch (error) {
      logger.log("Unable to connect to database with error: ", error);
      throw error;
    }
    let dbResult;
    const sanitizedSql = this._sanitize(sql, args);
    const sqlLowerCase = sql.toLowerCase();
    if (
      sqlLowerCase.startsWith("insert") &&
      sqlLowerCase.indexOf("output inserted") === -1
    ) {
      throw new Error("INSERT statements must have OUTPUT INSERTED clause");
    }
    try {
      const transaction = context.get("transaction");
      if (transaction) {
        dbResult = await transaction.request().query(sanitizedSql);
      } else {
        dbResult = await this.pool.request().query(sanitizedSql);
      }
    } catch (error) {
      logger.error(
        `SQL: ${sanitizedSql}, Args: ${JSON.stringify(args)}. Error: `,
        error
      );
      throw error;
    }
    const result = dbResult.recordset;
    if (sqlLowerCase.startsWith("insert") && result.length) {
      return result[0];
    }
    if (
      sqlLowerCase.startsWith("update") ||
      sqlLowerCase.startsWith("delete")
    ) {
      return dbResult.rowsAffected[0];
    }
    if (result && result.length) {
      if (firstRow) return result[0];
      return result;
    }
    if (firstRow) return null;
    return [];
  }

  async execute(name, params = [], outputParameter = null, schema = "[dbo]") {
    let dbResult;
    try {
      await this.pool.connect();
      const request = this.pool.request();
      if (outputParameter) request.output(outputParameter.name);
      params.forEach((param) => {
        request.input(param.name, param.value);
      });
      dbResult = await request.execute(`${schema}.${name}`);
    } catch (error) {
      logger.error("Unable to execute Stored Procedure with error: ", error);
      throw error;
    }
    let result = dbResult.recordsets;
    if (outputParameter !== null) {
      result = dbResult.output;
    } else if (result == null || result.length == 0) {
      result = null;
    }
    return result;
  }

  async executeBase(name, params = [], outputParameter = null) {
    let dbResult;
    try {
      await this.pool.connect();
      const request = this.pool.request();
      if (outputParameter) request.output(outputParameter.name);
      params.forEach((param) => {
        request.input(param.name, param.value);
      });
      dbResult = await request.execute(name);
    } catch (error) {
      logger.error("Unable to execute Stored Procedure with error: ", error);
      throw error;
    }
    return dbResult;
  }

  _sanitize(sql, args) {
    let sanitizedSql = sql;
    for (const arg of args) {
      if (Array.isArray(arg)) {
        sanitizedSql = sanitizedSql.replace("?", arg.join(","));
      } else if (arg instanceof Date) {
        const replacement = moment(arg).format("YYYY-MM-DD HH:mm:ss");
        sanitizedSql = sanitizedSql.replace("?", `'${replacement}'`);
      } else {
        sanitizedSql = sanitizedSql.replace("?", `'${arg}'`);
      }
    }
    return sanitizedSql;
  }
}
