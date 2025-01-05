/* eslint-disable */
const { Schema, model } = require("mongoose");

const UserDetailSchema = new Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  {
    collection: "UserDetail",
    strict: true,
  }
);

const UserModel = model("User", UserDetailSchema);

export default UserModel;
