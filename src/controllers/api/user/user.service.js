/* eslint-disable */
import UserModel from "../../../models/mongo/user";
import Utils from "../../../util/utils";
export default class UserService {
  static async getUserProfile({ userId } = {}) {
    if (!Utils.$isValid(userId)) return null;
    const result = await UserModel.findById(userId)
    console.log(result)
    return Utils.$isValidJson(result) ? result : { message: "User not Found"}
  }
}
