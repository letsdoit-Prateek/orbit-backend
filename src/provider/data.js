/* eslint-disable */
import Utils from "../util/utils";
import Db from "./db";

export default class DbData {
  static async getUserData({ userId, columnList } = {}) {
    if (!Utils.$isValid(userId)) return null;
    const defaultColumns = [
      "USER_PROFILE_ID",
      "USER_ID",
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "MOBILE_NO",
    ];
    const columns = Utils.$isValidArray(columnList)
      ? columnList.join(", ")
      : defaultColumns.join(", ");
    const dbResult = await Db.instance().query(
      `SELECT ${columns} FROM [dbo].[I4E_USER_PROFILE] WHERE [USER_ID] = '${userId}'`
    );
    if (Utils.$isValidArray(dbResult) && Utils.$isValidJson(dbResult[0])) {
      return dbResult[0];
    }
    return null;
  }

  static async getUserDataById({ userProfileId, columnList } = {}) {
    if (!Utils.$isValid(userProfileId)) return null;
    const defaultColumns = [
      "USER_PROFILE_ID",
      "USER_ID",
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "MOBILE_NO",
    ];
    const columns = Utils.$isValidArray(columnList)
      ? columnList.join(", ")
      : defaultColumns.join(", ");
    const dbResult = await Db.instance().query(
      `SELECT ${columns} FROM [dbo].[I4E_USER_PROFILE] WHERE [USER_PROFILE_ID] = '${userProfileId}'`
    );
    if (Utils.$isValidArray(dbResult) && Utils.$isValidJson(dbResult[0])) {
      return dbResult[0];
    }
    return null;
  }

  static async getUserDataFromMobileNo({ mobileNo, db } = {}) {
    if (!Utils.$isValidString(mobileNo)) return null;
    const defaultColumns = [
      "USER_PROFILE_ID",
      "USER_ID",
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "MOBILE_NO",
    ];
    const dbResult = await db.query(
      `SELECT ${defaultColumns.join(
        ", "
      )} FROM [dbo].[I4E_USER_PROFILE] WHERE [MOBILE_NO] = ?`,
      [mobileNo],
      true
    );
    return Utils.$isValidJson(dbResult) ? dbResult : null;
  }

  static async getPaymentGateWaySettings() {
    const result = await Db.instance().execute("GetPaymentGatewayData");
    return Utils.$isValidArray(result) ? result[0] : null;
  }

  static async saveSentMailTracking({
    entityTypeCode,
    entityId,
    sentTo,
    isSent,
  } = {}) {
    if (!Utils.$isValid(entityTypeCode) || !Utils.$isValid(sentTo))
      return false;
    const params = await Utils.$getParamsFromArgs(arguments);
    const outputParam = { name: "isSuccessfullySaved" };
    const result = await Db.instance().execute(
      "SaveMailSentTracking",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async getAllAvailableReferrals() {
    return await Db.instance().query(
      "SELECT * FROM [dbo].[I4E_EVENT_REFERRAL_MASTER] WHERE IS_ACTIVE=?",
      ["Y"]
    );
  }

  static async getStudentProfileDetails({ studentProfileId } = {}) {
    if (!Utils.$isValid(studentProfileId)) return null;
    const result = await Db.instance().query(
      "SELECT * FROM [dbo].[StudentProfileDetailsView] WHERE [StudentProfileId]=?",
      [studentProfileId],
      true
    );
    return Utils.$isValidJson(result) ? result : null;
  }

  static async getClientApiSecret({ clientCode } = {}) {
    if (!Utils.$isValid(clientCode)) return null;
    const result = await Db.instance().query(
      "SELECT [APIKEY] FROM [dbo].[ClientDetails] WHERE [ClientCode]=?",
      [clientCode],
      true
    );
    return Utils.$isValidJson(result) ? result?.APIKEY : null;
  }
}
