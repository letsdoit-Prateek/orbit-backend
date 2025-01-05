/* eslint-disable */
import jwt from "jsonwebtoken";
import moment from "moment";
import momentTimeZone from "moment-timezone";
import AzureADB2C from "../../../provider/azureADB2C";
import AzureVault from "../../../provider/azureVault";
import DbData from "../../../provider/data";
import Db from "../../../provider/db";
import Mobicomm from "../../../provider/mobicomm";
import TwilioSendGrid from "../../../provider/twilioSendGrid";
import BCryptEncoder from "../../../util/encryption/bCrypt";
import CryptoJsEnc from "../../../util/encryption/cryptoJS";
import Logger from "../../../util/logger";
import Utils from "../../../util/utils";
const axios = require("axios");
const baseConfig = require("../../../config/baseConfig.json");

export default class AuthService {
  static jwtPrefix = "Bearer ";

  // Get JWT Token Config
  static async getJwtConfig() {
    const [scope, issuer, secretKey, algorithm] = await Promise.all([
      AzureVault.getSecret("jwtScope"),
      AzureVault.getSecret("jwtIssuer"),
      AzureVault.getSecret("jwtSecretKey"),
      AzureVault.getSecret("jwtAlgorithm"),
    ]);
    return {
      scope,
      issuer,
      secretKey,
      algorithm,
      expiry: baseConfig.jwt.expiry,
      mobileExpiry: baseConfig.jwt.mobileExpiry,
      clientType: "OTP",
    };
  }

  // Generate jwt token based on usercode
  static async generateJWTToken({ userId, source = null } = {}) {
    let resultObj = { jwtToken: null, finalToken: null };
    if (!Utils.$isValid(userId)) return resultObj;

    // Get jwt config
    const jwtConfig = await AuthService.getJwtConfig();

    // Sign the jwt token
    const isMobile = Utils.$isValidString(source)
      ? ["ios", "android"].includes(`${source}`.toLowerCase())
      : false;
    const expTime = isMobile ? jwtConfig.mobileExpiry : jwtConfig.expiry;
    const jwtDateTime = Math.floor(Date.now() / 1000);
    const jwtToken = jwt.sign(
      {
        jti: jwtConfig.scope,
        iss: jwtConfig.issuer,
        sub: userId,
        user_access: "",
        ["access_scope"]: jwtConfig.scope,
        iat: jwtDateTime,
        exp: jwtDateTime + expTime * 60,
      },
      jwtConfig.secretKey,
      {
        algorithm: jwtConfig.algorithm,
        header: { clientType: jwtConfig.clientType },
      }
    );

    // Encrypt jwt token
    resultObj.jwtToken = jwtToken;
    resultObj.finalToken = await Utils.$aesEncrypt({ value: jwtToken });

    return resultObj;
  }

  // Get jwt token (produce i4e jwt + update user session)
  static async getJwtToken({ userCode, source = null } = {}) {
    if (!Utils.$isValid(userCode)) return null;

    // Generate i4e jwt auth token
    source = Utils.$nullify(source);
    const jwtTokenDetails = await AuthService.generateJWTToken({
      userId: userCode,
      source,
    });
    const { finalToken: jwtToken } = jwtTokenDetails;

    // Update user session
    await AuthService.addUserSession({
      jwtToken: jwtToken,
      userCode,
      source,
    });

    return this.jwtPrefix + jwtToken;
  }

  // Update the user login session in the db
  static async addUserSession({ jwtToken, userCode, db, source } = {}) {
    if (!Utils.$isValidString(jwtToken)) return false;
    db = db ? db : await Db.instance();
    const params = [
      { name: "jwtToken", value: null },
      { name: "finalToken", value: jwtToken },
      { name: "userCode", value: userCode },
      { name: "source", value: source },
    ];
    await db.execute("UpdateUserSession", params);
    return true;
  }

  // Get all the user details based on mobile number
  static async getAllUserDetailsWithMobileNo({ mobileNo, db } = {}) {
    if (!Utils.$isValidString(mobileNo)) return null;
    db = db ? db : await Db.instance();
    return await db.query(
      "SELECT * FROM [dbo].[I4E_USER_PROFILE] WHERE [MOBILE_NO]=?",
      [mobileNo],
      true
    );
  }

  // Get jwt token without sending and verifying otp
  static async validateUserWithoutOtp({ mobileNo, source = null } = {}) {
    if (
      !Utils.$isValidString(mobileNo) ||
      mobileNo.length !== 10 ||
      !/^\+?\d+$/.test(mobileNo)
    ) {
      return null;
    }

    // Get user details
    const result = await AuthService.getAllUserDetailsWithMobileNo({
      mobileNo,
    });
    if (!Utils.$isValidJson(result)) return null;

    // Return jwt token
    return await AuthService.getJwtToken({ userCode: result.USER_ID, source });
  }

  // Reset otop attempts - unlock the profile using mobile no
  static async resetOtpAttempts({ mobileNo } = {}) {
    if (!Utils.$isValidMobileNo(mobileNo)) return false;
    const db = await Db.instance();
    const result = await db.query(
      "SELECT * FROM dbo.I4E_USER_PROFILE WHERE MOBILE_NO=?",
      [mobileNo],
      true
    );
    if (Utils.$isValidJson(result) && Utils.$isValid(result.USER_PROFILE_ID)) {
      await db.query(
        "UPDATE dbo.OTP_MASTER SET OTP_FAILED_ATTEMPT = 0, USER_ACCOUNT_LOCKED = 0, LOCK_TIME = null, OTP_ATTEMPT_PER_DAY = 0 WHERE MOBILE_NO =?",
        [mobileNo]
      );
      return true;
    }
    return false;
  }

  // Update user fcm token - for mobile
  static async updateUserFCMToken({ userId, fcmToken } = {}) {
    if (!Utils.$isValid(userId)) return null;
    const params = await Utils.$getParamsFromArgs(arguments);
    const result = await Db.instance().execute("UpdateUserFCMToken", params);
    return Utils.$isValidArray(result) ? result[0]?.[0] : null;
  }

  // Send otp to user mobile number
  static async sendOtpToUser({ mobileNo, hash = null } = {}) {
    let resultObj = { data: null, isSuccessfullyProcessed: false, error: null };
    if (!Utils.$isValidMobileNo(mobileNo)) {
      resultObj.error = "Invalid Mobile number!";
      return resultObj;
    }

    // Fetch the data from opt master table
    const db = await Db.instance();
    const userData = await AuthService.getOtpMasterDetails({ mobileNo, db });

    // Otp attempt exceed check
    if (
      Utils.$isValidJson(userData) &&
      userData.OTP_ATTEMPT_PER_DAY >= baseConfig.otp.totalOtpAttemptsPerDay
    ) {
      resultObj.error = "You have exceeded the number of OTP attempts.";
      return resultObj;
    }

    // Account soft lock check
    if (
      Utils.$isValidJson(userData) &&
      (await this.isAccountLocked({ userData }))
    ) {
      resultObj.error =
        "You have exceeded the maximum number of attempts to enter the correct OTP. Your account is locked for the next 2 hours.";
      return resultObj;
    }

    // Check whether to send otp in response or not
    let sendOtpInResponse = await AzureVault.getSecret("sendOtpInResponse");
    sendOtpInResponse = Utils.$checkBoolString(`${sendOtpInResponse}`);

    // Generate otp
    let otp;
    if (mobileNo === process.env.PLAY_STORE_MOBILE_NO) {
      otp = process.env.PLAY_STORE_OTP;
    } else if (sendOtpInResponse) {
      otp = `${mobileNo}`.substring(0, 6);
    } else {
      otp = Utils.$generateOTP();
    }
    const otpTiming = await this.getOtpTiming();
    const reference = Utils.$encodeBase64(Utils.$generateRandomStr());
    const encryptedOtp = BCryptEncoder.encode(otp);

    // Save otp details in db
    const dbParams = [
      { name: "mobileNo", value: mobileNo },
      { name: "otp", value: encryptedOtp },
      {
        name: "generatedTime",
        value: otpTiming.generatedTime.format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        name: "expiryTime",
        value: otpTiming.expiryTime.format("YYYY-MM-DD HH:mm:ss"),
      },
      { name: "reference", value: reference },
    ];
    const outputParam = { name: "successfullySaved" };
    await db.execute("SaveOTPDetails", dbParams, outputParam);

    if (!sendOtpInResponse) {
      // Send sms
      const smsTemplateText = await Utils.$getTemplateText({
        templateId: await AzureVault.getSecret("otpSmsTemplateId"),
        params: { otp: otp, hash: hash ?? Utils.$generateRandomStr(10) },
        db,
      });
      const mobicommTempId = await AzureVault.getSecret("mobiCommOtpTempId");
      Mobicomm.sendSms({
        message: smsTemplateText,
        tempId: mobicommTempId,
        mobileNo,
      });

      // Send email
      this.sendOtpEmail({ userData, otp, db });
    }

    // Prepare response
    const resData = { response: reference };
    if (sendOtpInResponse) Object.assign(resData, { otp: otp });
    const encryptedData = await CryptoJsEnc.encrypt({
      data: JSON.stringify(resData),
    });
    resultObj.data = encryptedData;
    resultObj.isSuccessfullyProcessed = true;
    return resultObj;
  }

  static async isAccountLocked({ userData } = {}) {
    if (!Utils.$isValidJson(userData)) return false;
    if (userData?.USER_ACCOUNT_LOCKED || Utils.$isValid(userData?.LOCK_TIME)) {
      const lockTime = await this.getOtpLockEndTime({
        time: userData.LOCK_TIME,
      });
      const currentDate = momentTimeZone.tz(moment(), "Asia/Calcutta");
      return currentDate < lockTime;
    }
    return false;
  }

  static async getOtpLockEndTime({ time } = {}) {
    const lockTime = new Date(time);
    const lockTimePeriod = baseConfig.otp.lockTimeInSec;
    lockTime.setSeconds(
      lockTime.getSeconds() + Utils.$convertToInt(lockTimePeriod)
    );
    return moment(lockTime);
  }

  static async getOtpTiming() {
    const currentTime = momentTimeZone.tz(moment(), "Asia/Calcutta");
    const expiryPeriod = baseConfig.otp.expiryTimeInSec;
    const expiryTime = currentTime.clone().add(expiryPeriod, "seconds");
    return { generatedTime: currentTime, expiryTime };
  }

  static async sendOtpEmail({ userData, otp, db } = {}) {
    if (!Utils.$isValid(userData)) return false;
    const userDetails = await DbData.getUserDataFromMobileNo({
      mobileNo: userData.MOBILE_NO,
      db,
    });
    if (!Utils.$isValidJson(userDetails) || !Utils.$isValid(userDetails.EMAIL))
      return false;
    const otpEmailTemplateId = await AzureVault.getSecret("otpEmailTemplateId");
    const templateData = await db.query(
      "SELECT * FROM dbo.MLTemplate WHERE TemplateId=?",
      [otpEmailTemplateId],
      true
    );
    if (
      !Utils.$isValidJson(templateData) ||
      !Utils.$isValid(templateData.TemplateUrl)
    )
      return false;
    let htmlContent = null;
    try {
      const response = await axios.get(templateData.TemplateUrl);
      htmlContent = response.data;
    } catch (error) {
      Logger.error("Error fetching HTML content:", error);
    }
    if (!Utils.$isValid(htmlContent)) return false;
    const modifiedHtml = htmlContent.replace("{@OTP}", otp);
    const result = TwilioSendGrid.sendEmail({
      to: [userDetails.EMAIL],
      subject: templateData.TemplateSubject,
      html: modifiedHtml,
    });
    return result;
  }

  static async createNewUser({
    mobileNo,
    firstName,
    lastName,
    emailId,
    dob,
    genderId,
    externalAuthId,
    userId,
  } = {}) {
    const mandatoryFeilds = [mobileNo, firstName, lastName];
    if (Utils.$hasNulls(mandatoryFeilds)) return null;
    const params = await Utils.$getParamsFromArgs(arguments);
    const outputParam = { name: "userProfileId" };
    const result = await Db.instance().execute(
      "CreateNewUserProfile",
      params,
      outputParam
    );
    return Utils.$isValid(result) ? result : null;
  }

  static async b2cLogin({ authInfo } = {}) {
    if (!Utils.$isValid(authInfo)) return null;

    // Fetch mobile number from Azure AD B2C auth token
    let mobileNo = await AzureADB2C.fetchLoginDetails({ authInfo: authInfo });

    // Check if mobile number is valid or not
    if (!Utils.$isValid(mobileNo)) return null;

    // Get clean mobile number
    mobileNo = Utils.$getMobileNumberWithoutPrefix(mobileNo);

    // Generate i4e jwt internal token
    let i4eJwt = await AuthService.validateUserWithoutOtp({ mobileNo });
    if (Utils.$isValidString(i4eJwt)) return i4eJwt;

    // If new user if not exists
    const newUserDetails = await AuthService.createNewUser({
      mobileNo,
      firstName: authInfo.given_name,
      lastName: authInfo.family_name,
      externalAuthId: authInfo.oid,
    });
    // Check for valid new user details
    if (!Utils.$isValid(newUserDetails)) return null;

    // Generate i4e jwt internal token
    i4eJwt = await AuthService.validateUserWithoutOtp({ mobileNo });
    return i4eJwt;
  }

  static async signUpUser({
    firstName,
    lastName,
    mobileNo,
    emailId,
    genderId,
    dateOfBirth,
    password,
    referralCode,
    consentForCommunication,
    userId,
  } = {}) {
    let response = {
      error: null,
      MobileNoExists: false,
      EmailIdExists: false,
      UserCode: null,
      UserProfileId: null,
    };

    // Validate input
    const validationResponse = this.validateUserInput({
      mobileNo,
      emailId,
      password,
    });
    if (Utils.$isValid(validationResponse.error)) {
      response.error = validationResponse.error;
      return response;
    }

    // User referral code validation
    if (Utils.$isValid(referralCode)) {
      const referralDetails = await AuthService.validateUserReferralCode({
        referralCode,
      });
      if (!referralDetails.isValidRefferal) {
        response.error = referralDetails.error;
        return response;
      }
    }

    // Encrypt password if valid
    let encryptedPassword = null;
    if (Utils.$isValid(password)) {
      encryptedPassword = BCryptEncoder.encode(password).toString();
    }

    // Prepare user parameters for database insertion
    let userParams = await Utils.$getExcludedParamsFromArgs(arguments, [
      "password",
    ]);
    userParams.push({ name: "password", value: encryptedPassword });
    const dbResult = await Db.instance().execute("CreateUser", userParams);
    if (Utils.$isValidJson(dbResult?.[0]?.[0])) {
      const dbResponse = dbResult[0][0];
      response.MobileNoExists = dbResponse.MobileNoExists;
      response.EmailIdExists = dbResponse.EmailIdExists;
      response.UserCode = dbResponse.UserCode;
      response.UserProfileId = dbResponse.UserProfileId;
    }

    return response;
  }

  static async loginWithEmail({ emailId, password } = {}) {
    let response = { error: null, isProfileAvailable: false, jwtToken: null };

    // Validate input
    const validationResponse = this.validateLoginInput(emailId, password);
    if (Utils.$isValid(validationResponse.error)) {
      response.error = validationResponse.error;
      return response;
    }

    // Fetch the user's data
    const userData = await this.fetchUserByEmail(emailId);
    if (Utils.$isValid(userData.error)) {
      response.error = userData.error;
      return response;
    }
    const userDetails = userData.userData;
    response.isProfileAvailable = true;

    // Validate password
    if (!BCryptEncoder.compare(password, userDetails.PASSWORD)) {
      response.error = "Incorrect password. Please check.";
      return response;
    }

    // Get jwt token
    response.jwtToken = await AuthService.getJwtToken({
      userCode: userDetails.USER_ID,
    });

    return response;
  }

  static async updatePassword({
    emailId,
    oldPassword,
    newPassword,
    userId,
  } = {}) {
    let response = {
      error: null,
      isSuccessfullyUpdated: false,
      isProfileAvailable: false,
    };

    // Validate input
    const validationResponse = this.validatePasswordUpdateInput(
      emailId,
      oldPassword,
      newPassword
    );
    if (Utils.$isValid(validationResponse.error)) {
      response.error = validationResponse.error;
      return response;
    }

    // Fetch the user's data
    const userData = await this.fetchUserByEmail(emailId);
    if (Utils.$isValid(userData.error)) {
      response.error = userData.error;
      return response;
    }
    const userDetails = userData.userData;
    response.isProfileAvailable = true;

    // Validate old password
    if (!BCryptEncoder.compare(oldPassword, userDetails.PASSWORD)) {
      response.error = "Wrong Old password.";
      return response;
    }

    // Encrypt new password
    const newEncryptedPassword = BCryptEncoder.encode(newPassword).toString();

    // Update the password in db
    const params = [
      { name: "emailId", value: emailId },
      { name: "password", value: newEncryptedPassword },
      { name: "userId", value: userId },
    ];
    const outputParam = { name: "isSuccessfullyUpdated" };
    const result = await Db.instance().execute(
      "UpdateUserPassword",
      params,
      outputParam
    );
    response.isSuccessfullyUpdated = Utils.$checkRowsUpdated(
      result,
      outputParam.name
    );

    return response;
  }

  static async setPasswordForUser({ emailId, password, userId } = {}) {
    let response = { isPasswordSetSucessfully: false, error: null };

    // Validate input
    const validationResponse = this.validateLoginInput(emailId, password);
    if (Utils.$isValid(validationResponse.error)) {
      response.error = validationResponse.error;
      return response;
    }

    // Fetch the user's data
    const userDetails = await this.fetchUserByEmail(emailId);
    if (Utils.$isValid(userDetails.error)) {
      response.error = userDetails.error;
      return response;
    }
    const userData = userDetails.userData;

    /* Validate the user
      Check whether the user is updating his profile 
      or other profile by entering other email address
    */
    if (Utils.$convertToInt(userData?.USER_PROFILE_ID) != userId) {
      response.error = "Profile details doesn't match. Please check!";
      return response;
    }

    // Check whether password already exists - then ask to update the password
    if (Utils.$isValid(userData?.PASSWORD)) {
      response.error = "Password already exists!";
      return response;
    }

    // Encrypt the password
    const encryptedPassword = BCryptEncoder.encode(password).toString();

    // Update the password in db
    const params = [
      { name: "emailId", value: emailId },
      { name: "userId", value: userId },
      { name: "password", value: encryptedPassword },
    ];
    const outputParam = { name: "isPasswordSetSuccessfully" };
    const result = await Db.instance().execute(
      "SetPasswordForUser",
      params,
      outputParam
    );
    response.isPasswordSetSucessfully = Utils.$checkRowsUpdated(
      result,
      outputParam.name
    );

    return response;
  }

  static async validateUserReferralCode({ referralCode } = {}) {
    const response = { isValidRefferal: true, error: null };
    if (!referralCode) return response;
    const referrals = await DbData.getAllAvailableReferrals();
    if (!Utils.$isValidArray(referrals)) {
      response.isValidRefferal = false;
      response.error = "No referrals found in db!";
      return response;
    }
    const isValidReferral = referrals.some(
      (referral) => referral.REFERRAL_CODE === referralCode
    );
    if (!isValidReferral) {
      response.isValidRefferal = isValidReferral;
      response.error = "Please check the referral code!";
    }
    return response;
  }

  static validateUserInput({ mobileNo, emailId, password }) {
    if (!Utils.$isValid(mobileNo) && !Utils.$isValid(emailId)) {
      return { error: "Either mobile number or email ID is mandatory." };
    }
    if (Utils.$isValid(mobileNo) && !Utils.$isValidMobileNo(mobileNo)) {
      return { error: "Incorrect mobile number. Please check." };
    }
    if (Utils.$isValid(emailId) && !Utils.$isValidEmail(emailId)) {
      return { error: "Incorrect email ID. Please check." };
    }
    if (
      Utils.$isValid(emailId) &&
      (!Utils.$isValid(password) || !Utils.$isValidPassword(password))
    ) {
      return { error: "Incorrect password. Please check." };
    }
    return { error: null };
  }

  static validateLoginInput(emailId, password) {
    if (!Utils.$isValidEmail(emailId)) {
      return { error: "Incorrect emailId. Please check!" };
    }
    if (!Utils.$isValidString(password) || !Utils.$isValidPassword(password)) {
      return { error: "Incorrect password. Please check!" };
    }
    return { error: null };
  }

  static validatePasswordUpdateInput(emailId, oldPassword, newPassword) {
    if (!Utils.$isValidEmail(emailId)) {
      return { error: "Invalid emailId. Please check!" };
    }
    if (
      !Utils.$isValidString(oldPassword) ||
      !Utils.$isValidPassword(oldPassword)
    ) {
      return { error: "Invalid old password. Please check!" };
    }
    if (
      !Utils.$isValidString(newPassword) ||
      !Utils.$isValidPassword(newPassword)
    ) {
      return { error: "Invalid new password. Please check!" };
    }
    if (oldPassword === newPassword) {
      return { error: "New password should not be same as old password!" };
    }
    return { error: null };
  }

  static async fetchUserByEmail(emailId) {
    let response = { error: null, userData: null };
    const userData = await Db.instance().query(
      "SELECT * FROM [dbo].[I4E_USER_PROFILE] WHERE EMAIL=?",
      [emailId]
    );
    if (!Utils.$isValidArray(userData)) {
      response.error =
        "No account found with the provided email address. Please sign up";
      return response;
    }
    if (Utils.$isValidArray(userData) && userData.length > 1) {
      response.error =
        "More than one user is registered with this email address.";
      return response;
    }
    response.userData = userData[0];
    return response;
  }

  static async authenticateUserWithOtp({ token, mobileNo } = {}) {
    let response = { data: null };
    if (!Utils.$isValidString(token) || !Utils.$isValidMobileNo(mobileNo)) {
      return response;
    }

    // Fetch otp master details for otp and reference no
    const db = await Db.instance();
    const otpMasterDetails = await AuthService.getOtpMasterDetails({
      mobileNo,
      db,
    });
    if (
      !Utils.$isValidJson(otpMasterDetails) ||
      !Utils.$isValid(otpMasterDetails.REFERENCE_NO)
    ) {
      return response;
    }

    // Prepare secret key (Reference No)
    const secretKey = otpMasterDetails.REFERENCE_NO;

    // Check weather otp is matching or not
    const isValidOtp = await AuthService.validateOtp({
      token,
      secretKey,
      otpMasterDetails,
    });
    if (!isValidOtp) return response;

    // Get jwt token if otp is valid
    const jwtTokenDetails = await AuthService.getJwtFromMobileNumber({
      mobileNo,
      db,
    });

    // Encrypt the jwt token details
    const encryptedData = await CryptoJsEnc.encrypt({
      data: JSON.stringify(jwtTokenDetails),
      secretKey,
    });

    response.data = encryptedData;
    return response;
  }

  static async getOtpMasterDetails({ mobileNo, db } = {}) {
    if (!Utils.$isValidMobileNo(mobileNo)) return null;
    db = db ? db : await Db.instance();
    return await db.query(
      "SELECT * FROM [dbo].[OTP_MASTER] WHERE [MOBILE_NO] = ?",
      [mobileNo],
      true
    );
  }

  static async validateOtp({ token, secretKey, otpMasterDetails } = {}) {
    if (!Utils.$isValid(token)) return false;
    const decryptedData = await CryptoJsEnc.decrypt({ data: token, secretKey });
    const parsedData = JSON.parse(decryptedData);
    // Here from client side otp is named as password and mobile is
    // named as clientId and encrypted the obj and passed as data/token
    const matchedOtp = BCryptEncoder.verify(
      parsedData?.password,
      otpMasterDetails.OTP
    );
    return matchedOtp;
  }

  static async getJwtFromMobileNumber({ mobileNo, db } = {}) {
    let response = { isProfileAvailable: false, jwt: "" };

    // Fetch user details
    const userDetails = AuthService.getAllUserDetailsWithMobileNo({
      mobileNo,
      db,
    });
    if (!Utils.$isValidJson(userDetails)) return response;

    // If user exists - Generate token
    response.isProfileAvailable = true;
    response.jwt = await AuthService.getJwtToken({
      userCode: userDetails.USER_ID,
    });

    return response;
  }

  static async VerifyEmail({ emailId } = {}) {
    let resultObj = { data: null, isSuccessfullyProcessed: false, error: null };
    if (!Utils.$isValidEmail(emailId)) {
      resultObj.error = "Invalid EmailId!";
      return resultObj;
    }

    const otp = Utils.$generateOTP();
    const otpTiming = await this.getOtpTiming();
    const reference = Utils.$encodeBase64(Utils.$generateRandomStr());
    const encryptedOtp = BCryptEncoder.encode(otp);
    const db = await Db.instance();

    // Save otp details in db
    const dbParams = [
      { name: "emailId", value: emailId },
      { name: "otp", value: encryptedOtp },
      {
        name: "generatedTime",
        value: otpTiming.generatedTime.format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        name: "expiryTime",
        value: otpTiming.expiryTime.format("YYYY-MM-DD HH:mm:ss"),
      },
      { name: "reference", value: reference },
    ];
    const outputParam = { name: "successfullySaved" };
    await db.execute("SaveEmailOTPDetails", dbParams, outputParam);

    // Send otp verification email
    this.sendVerifyEmailOtp({ emailId, otp, db });

    const resData = { response: reference };
    let sendOtpInResponse = await AzureVault.getSecret("sendOtpInResponse");
    sendOtpInResponse = Utils.$checkBoolString(sendOtpInResponse);
    if (sendOtpInResponse) Object.assign(resData, { otp: otp });
    const encryptedData = await CryptoJsEnc.encrypt({
      data: JSON.stringify(resData),
    });
    resultObj.data = encryptedData;
    resultObj.isSuccessfullyProcessed = true;
    return resultObj;
  }

  static async sendVerifyEmailOtp({ emailId, otp, db } = {}) {
    if (!Utils.$isValidEmail(emailId)) return false;
    const otpEmailTemplateId = await AzureVault.getSecret("otpEmailTemplateId");
    const templateData = await db.query(
      "SELECT * FROM dbo.MLTemplate WHERE TemplateId=?",
      [otpEmailTemplateId],
      true
    );
    if (
      !Utils.$isValidJson(templateData) ||
      !Utils.$isValid(templateData.TemplateUrl)
    )
      return false;
    let htmlContent = null;
    try {
      const response = await axios.get(templateData.TemplateUrl);
      htmlContent = response.data;
    } catch (error) {
      Logger.error("Error fetching HTML content:", error);
    }
    if (!Utils.$isValid(htmlContent)) return false;
    const modifiedHtml = htmlContent.replace("{@OTP}", otp);
    const result = TwilioSendGrid.sendEmail({
      to: emailId,
      subject: templateData.TemplateSubject,
      html: modifiedHtml,
    });
    return result;
  }

  static async verifyMobileOtp({ clientID, encryptedOTP } = {}) {
    if (!Utils.$isValid(clientID)) return false;
    const db = await Db.instance();
    const otpMasterDetails = await this.getOtpMasterDetails({
      mobileNo: clientID,
      db,
    });
    if (
      !Utils.$isValidJson(otpMasterDetails) ||
      !Utils.$isValid(otpMasterDetails?.REFERENCE_NO)
    ) {
      return false;
    }

    // Check weather otp is matching or not
    return await AuthService.validateOtp({
      token: encryptedOTP,
      secretKey: otpMasterDetails.REFERENCE_NO,
      otpMasterDetails,
    });
  }

  static async authenticateMobile({
    clientID,
    encryptedOTP,
    source = null,
  } = {}) {
    const response = {
      jwt: null,
      isProfileAvailable: false,
      isOtpVerified: false,
    };

    if (!Utils.$isValid(clientID)) return response;
    const db = await Db.instance();
    const otpMasterDetails = await this.getOtpMasterDetails({
      mobileNo: clientID,
      db,
    });
    if (
      !Utils.$isValidJson(otpMasterDetails) ||
      !Utils.$isValid(otpMasterDetails?.REFERENCE_NO)
    ) {
      return response;
    }

    // Fetch whether user exists or not
    const userDetails = await AuthService.getAllUserDetailsWithMobileNo({
      mobileNo: clientID,
      db,
    });
    response.isProfileAvailable = Utils.$isValidJson(userDetails);

    // Check weather otp is matching or not
    response.isOtpVerified = await AuthService.validateOtp({
      token: encryptedOTP,
      secretKey: otpMasterDetails.REFERENCE_NO,
      otpMasterDetails,
    });
    if (!response.isOtpVerified) return response;

    // If user exists and otp is valid then generate the jwt token
    if (response.isProfileAvailable && response.isOtpVerified) {
      response.jwt = await AuthService.getJwtToken({
        userCode: userDetails?.USER_ID,
        source,
      });
    }

    return response;
  }

  static async authenticateEmailOtp({ emailId, token } = {}) {
    if (!Utils.$isValidEmail(emailId)) return false;
    const otpMasterDetails = await await Db.instance().query(
      "SELECT * FROM [dbo].[OTP_MASTER] WHERE [EMAIL] = ?",
      [emailId],
      true
    );
    if (
      !Utils.$isValidJson(otpMasterDetails) ||
      !Utils.$isValid(otpMasterDetails?.REFERENCE_NO)
    ) {
      return false;
    }

    // Check weather otp is matching or not
    return await AuthService.validateOtp({
      token,
      secretKey: otpMasterDetails.REFERENCE_NO,
      otpMasterDetails,
    });
  }

  static async resetPassword({ emailId, newPassword } = {}) {
    let response = {
      error: null,
      isSuccessfullyUpdated: false,
      isProfileAvailable: false,
    };

    // Validate input
    const validationResponse = this.validatePasswordResetInput(
      emailId,
      newPassword
    );
    if (Utils.$isValid(validationResponse.error)) {
      response.error = validationResponse.error;
      return response;
    }

    // Fetch the user's data
    const userDetails = await this.fetchUserByEmail(emailId);
    if (Utils.$isValid(userDetails.error)) {
      response.error = userDetails.error;
      return response;
    }
    const userData = userDetails.userData;

    const existingPassword = userData.PASSWORD;
    const isPasswordMatch = BCryptEncoder.verify(newPassword, existingPassword);

    if (isPasswordMatch) {
      response.error = "New password should not be same as Old Password";
      return response;
    }

    // Encrypt new password
    const newEncryptedPassword = BCryptEncoder.encode(newPassword).toString();

    // Update the password in db
    const params = [
      { name: "emailId", value: emailId },
      { name: "password", value: newEncryptedPassword },
      { name: "userId", value: userData.USER_PROFILE_ID },
    ];
    const outputParam = { name: "isSuccessfullyUpdated" };
    const result = await Db.instance().execute(
      "UpdateUserPassword",
      params,
      outputParam
    );
    response.isSuccessfullyUpdated = Utils.$checkRowsUpdated(
      result,
      outputParam.name
    );

    return response;
  }

  static validatePasswordResetInput(emailId, newPassword) {
    if (!Utils.$isValidEmail(emailId)) {
      return { error: "Invalid emailId. Please check!" };
    }
    if (
      !Utils.$isValidString(newPassword) ||
      !Utils.$isValidPassword(newPassword)
    ) {
      return { error: "Invalid new password. Please check!" };
    }
    return { error: null };
  }
}
