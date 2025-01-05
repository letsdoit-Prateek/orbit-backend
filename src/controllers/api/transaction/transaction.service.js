/* eslint-disable */
import Db from "../../../provider/db";
import Utils from "../../../util/utils";

export default class TransactionService {
  static async getAllTranscationList({ userId } = {}) {
    const resObj ={ userProfiles: [] };
    if (!Utils.$isValid(userId)) return resObj;
    const result = await Db.instance().execute("GetUserProfile", [
      { name: "userId", value: userId },
    ]);
    if (Utils.$isValidArray(result?.[0])) {
      resObj.userProfiles = result[0];
    }
    return resObj;
  }
}
