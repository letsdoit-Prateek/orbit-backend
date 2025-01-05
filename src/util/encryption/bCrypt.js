/* eslint-disable */
import Logger from "../logger";
const bcrypt = require("bcrypt");

export default class BCryptEncoder {
  constructor(strength = 10, version = "$2a", random = null) {
    if (
      strength !== -1 &&
      (strength < bcrypt.MIN_LOG_ROUNDS || strength > bcrypt.MAX_LOG_ROUNDS)
    ) {
      throw new Error("Bad strength");
    }
    this.version = version;
    this.random = random;
    this.strength = strength === -1 ? 10 : strength;
  }

  static encode(rawPassword) {
    if (!rawPassword) {
      throw new Error("rawPassword cannot be null");
    }
    const salt = this.getSalt();
    return bcrypt.hashSync(rawPassword.toString(), salt);
  }

  static getSalt() {
    return bcrypt.genSaltSync(10, "a");
  }
  static verify(rawPassword, encodedPassword) {
    if (!rawPassword) {
      throw new Error("rawPassword cannot be null");
    }
    if (!encodedPassword || encodedPassword.length === 0) {
      Logger.error("Empty encoded password");
      return false;
    }
    return bcrypt.compareSync(rawPassword.toString(), encodedPassword);
  }


  static upgradeEncoding(encodedPassword) {
    if (!encodedPassword || encodedPassword.length === 0) {
      Logger.error("Empty encoded password");
      return false;
    }
    const matcher = encodedPassword.match(
      /^\$2(a|y|b)?\$(\d\d)\$[./0-9A-Za-z]{53}$/
    );
    if (!matcher) {
      throw new Error(
        "Encoded password does not look like BCrypt: " + encodedPassword
      );
    }
    const strength = parseInt(matcher[2]);
    return strength < this.strength;
  }

  static compare(text, hash) {
    return bcrypt.compareSync(text, hash);
  }
}
