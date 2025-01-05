/* eslint-disable */
import mssql from "mssql";
import careerLibraryModel from "../../../models/mongo/careerLibrary";
import Azure from "../../../provider/azure";
import AzureVault from "../../../provider/azureVault";
import Db from "../../../provider/db";
import Logger from "../../../util/logger";
import Utils from "../../../util/utils";
const axios = require("axios");
const xlsx = require("xlsx");
const baseConfig = require("../../../config/baseConfig.json");

export default class CareerLibraryService {
  // ****************************************************************************
  //                         CAREER LIBRARY SERVICE
  // ****************************************************************************

  static async getCareerLibraryMetaData() {
    const result = await Db.instance().execute("GetCareerLibraryMetaData");
    const [
      careerCategory,
      careerSkillCategory,
      careerSkill,
      institute,
      examType,
      exam,
      company,
      famousPersonality,
      educationLevel,
    ] = result;
    const response = {
      careerCategory,
      careerSkillCategory,
      careerSkill,
      institute,
      examType,
      exam,
      company,
      famousPersonality,
      educationLevel,
    };
    return response;
  }

  static prepareSqlParams({ careerDetails, userId, careerId = null }) {
    let sqlDbParams = [
      { name: "careerCode", value: careerDetails.careerCode },
      { name: "careerName", value: careerDetails.careerName },
      { name: "careerCategoryId", value: careerDetails.careerCategoryId },
      { name: "userId", value: userId },
    ];
    if (Utils.$isValid(careerId)) {
      sqlDbParams.push({ name: "careerId", value: careerId });
    }
    sqlDbParams = Utils.$nullifyParams(sqlDbParams);

    const sqlDataEntries = [
      "careerSkillIds",
      "instituteIds",
      "examIds",
      "companyIds",
      "personalityIds",
    ];

    sqlDataEntries.forEach((entry) => {
      const entryData = careerDetails[entry];
      const idsTableType = new mssql.Table();
      idsTableType.columns.add("Id", mssql.BigInt);
      entryData.forEach((data) => {
        idsTableType.rows.add(Utils.$isValid(data) ? data : null);
      });
      sqlDbParams.push({ name: entry, value: idsTableType });
    });

    return sqlDbParams;
  }

  static async createCareer({ careerDetails, userId } = {}) {
    let response = { careerId: null };
    if (!Utils.$isValidJson(careerDetails)) return response;

    const sqlDbParams = this.prepareSqlParams({ careerDetails, userId });

    const outputParam = { name: "careerId" };
    const dbResult = await Db.instance().execute(
      "SaveCareerDetails",
      sqlDbParams,
      outputParam
    );

    let careerId = null;
    if (
      Utils.$isValidJson(dbResult) &&
      Utils.$isValid(dbResult[outputParam.name])
    ) {
      careerId = Utils.$convertToInt(dbResult[outputParam.name]);
    }
    response.careerId = careerId;

    await careerLibraryModel.findOneAndUpdate(
      { careerId: careerId },
      { $set: { careerId, ...careerDetails } },
      { new: true, upsert: true }
    );

    return response;
  }

  static async updateCareer({ careerDetails, userId } = {}) {
    let response = false;
    if (
      !Utils.$isValidJson(careerDetails) ||
      !Utils.$isValid(careerDetails?.careerId)
    ) {
      return response;
    }
    const careerId = careerDetails.careerId;

    const sqlDbParams = this.prepareSqlParams({
      careerDetails,
      userId,
      careerId,
    });
    sqlDbParams.push({ name: "isActive", value: careerDetails.isActive });

    const outputParam = { name: "isSucessfullyUpdated" };
    const dbResult = await Db.instance().execute(
      "UpdateCareerDetails",
      sqlDbParams,
      outputParam
    );
    response = Utils.$checkRowsUpdated(dbResult, outputParam.name);

    await careerLibraryModel.findOneAndUpdate(
      { careerId: careerId },
      { $set: { careerId, ...careerDetails } },
      { new: true, upsert: true }
    );

    return response;
  }

  static async uploadYoutubeLinks({ youtubeLinks, careerId, files } = {}) {
    let isSuccess = false;
    if (!Utils.$isValidArray(youtubeLinks)) return isSuccess;

    // Directly populate youtubeData using map
    const youtubeData = youtubeLinks.map((el) => {
      return {
        image: el?.thumbnailImgUrl?.value || "",
        link: el?.url?.value,
      };
    });

    // Validate and upload files in parallel
    const uploadPromises = files.map(async (file, idx) => {
      const { mimetype, originalname, buffer } = file;

      if (
        Utils.$isValidJson(file) &&
        Utils.$isValidImgExt(mimetype.split("/")[1])
      ) {
        const imageName = await Utils.$generateFileName({
          imageType: "YoutubeThumbnail",
          randomize: true,
          extension: originalname.split(".").pop(),
        });
        const thumbnailUrl = await Azure.uploadFile({
          fileName: imageName,
          fileStream: buffer,
          containerName: baseConfig.azure.containerConfig.clYoutubeThumbnails,
        });
        youtubeData[idx].image = thumbnailUrl || "";
      }
    });

    // Await all upload promises
    await Promise.all(uploadPromises);

    // Save the data in MongoDB
    try {
      // Upsert the youtube video links data against careerId
      await careerLibraryModel.findOneAndUpdate(
        { careerId },
        { youtubeLink: youtubeData },
        { new: true }
      );
      isSuccess = true;
    } catch (err) {
      Logger.error("Error while uploading youtube video links: ", err);
    }

    return isSuccess;
  }

  static async uploadEducationPath({
    educationPath,
    careerId,
    files,
    srno,
  } = {}) {
    let isSuccess = false;
    if (!Utils.$isValidArray(educationPath)) return isSuccess;

    // // Flatten the educationPath array
    // const educationPathArr = educationPath.flat();

    // // Validate and upload files in parallel
    // const uploadPromises = files.map(async (file, idx) => {
    //   const { mimetype, originalname, buffer } = file;

    //   if (
    //     Utils.$isValidJson(file) &&
    //     Utils.$isValidImgExt(mimetype.split("/")[1])
    //   ) {
    //     const imageName = await Utils.$generateFileName({
    //       imageType: "EducationPathIcon",
    //       randomize: true,
    //       extension: originalname.split(".").pop(),
    //     });
    //     const iconUrl = await Azure.uploadFile({
    //       fileName: imageName,
    //       fileStream: buffer,
    //       containerName: baseConfig.azure.containerConfig.clEducationPathLogo,
    //     });
    //     educationPathArr[idx].icon.value = iconUrl;
    //   }
    // });

    // // Await all upload promises
    // await Promise.all(uploadPromises);

    // Save the data in MongoDB
    try {
      await careerLibraryModel.findOneAndUpdate(
        { careerId },
        { $push: { educationPath: { details: educationPath, srno } } },
        { new: true, upsert: true }
      );
      isSuccess = true;
    } catch (err) {
      Logger.error("Error while saving the education path: ", err);
    }

    return isSuccess;
  }

  static async getAllCategoryCareers({ slug } = {}) {
    if (!Utils.$isValid(slug)) return null;
    const result = await Db.instance().execute("GetAllCategoryCareers", [
      { name: "slug", value: slug },
    ]);
    if (!Utils.$isValidArray(result) || !Utils.$isValidArray(result[0])) {
      return null;
    }
    const dbResult = result[0];

    // Extract career category ids
    const categoryCareerIds = dbResult.map((data) => data?.CareerID);

    // Get the mongo result
    const mongoDbResult = await careerLibraryModel.find(
      {
        careerId: { $in: categoryCareerIds },
      },
      {
        careerId: 1,
        shortDescription: 1,
        avgSalary: 1,
        description: 1,
        "expectedRange.isVisible": 1,
      }
    );

    // Convert SQL result to object for easy updating
    const response = dbResult.reduce((acc, item) => {
      acc[item.CareerID] = item;
      return acc;
    }, {});

    // Merge MongoDB results with SQL results
    mongoDbResult.forEach((item) => {
      if (response[item.careerId]) {
        response[item.careerId].avgSalary = item.avgSalary || "0";
        response[item.careerId].shortDescription = item.shortDescription || "";
        response[item.careerId].description = item.description || "";
        response[item.careerId].expectedRange = item?.expectedRange[0] || {};
      }
    });

    // Convert the object back to an array and return
    return Object.values(response);
  }

  static async getCareerDetails({
    slug,
    onlyActive,
    queryFrom = "client",
  } = {}) {
    if (!Utils.$isValid(slug)) {
      return await CareerLibraryService.getAllCareerDetails({
        onlyActive,
      });
    }

    // Get response from sql
    let response = null;
    const dbResult = await Db.instance().execute("GetCareerDetails", [
      { name: "slug", value: slug },
    ]);
    if (!Utils.$isValidArray(dbResult)) return response;
    const [
      careerDetails,
      careerSkill,
      careerInstitute,
      careerExam,
      careerCompany,
      careerPersonality,
    ] = dbResult;
    response = {
      careerDetails,
      careerSkill,
      careerInstitute,
      careerExam,
      careerCompany,
      careerPersonality,
    };
    const careerId = careerDetails?.[0]?.CareerID;
    if (!Utils.$isValid(careerId)) return null;
    // Get response from mongo
    let mongoResponse = {};
    if (queryFrom === "admin") {
      mongoResponse = await careerLibraryModel
        .findOne({ careerId })
        .select("-__v")
        .select("-_id");
      if (
        Utils.$isValidJson(mongoResponse) &&
        Utils.$isValidJson(mongoResponse?._doc)
      ) {
        Utils.$sortArrayOfObj(mongoResponse.educationPath, "srno", "asc");

        Object.assign(response, mongoResponse["_doc"]);
      }
    } else {
      mongoResponse = await careerLibraryModel.aggregate([
        {
          $match: {
            careerId: careerId * 1,
          },
        },
        {
          $set: {
            educationPath: {
              $map: {
                input: "$educationPath",
                as: "education",
                in: {
                  $let: {
                    vars: {
                      details: {
                        $filter: {
                          input: "$$education.details",
                          as: "detail",
                          cond: {
                            $and: [
                              {
                                $ne: ["$$detail.certification.value", null],
                              },
                              {
                                $ne: ["$$detail.certification.value", ""],
                              },
                              {
                                $ne: ["$$detail.certification.value", "null"],
                              },
                              {
                                $ne: [
                                  "$$detail.certification.value",
                                  "undefined",
                                ],
                              },
                              {
                                $ne: [
                                  "$$detail.certification.value",
                                  undefined,
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $mergeObjects: ["$$education", { details: "$$details" }],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $set: {
            educationPath: {
              $map: {
                input: "$educationPath",
                as: "education",
                in: {
                  $mergeObjects: [
                    "$$education",
                    {
                      details: {
                        $filter: {
                          input: "$$education.details",
                          as: "detail",
                          cond: {
                            $and: [{ $ne: ["$$detail", {}] }],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $unset: ["_id", "__v"],
        },
      ]);
      if (
        Utils.$isValidArray(mongoResponse) &&
        Utils.$isValidJson(mongoResponse[0])
      ) {
        Utils.$sortArrayOfObj(mongoResponse[0].educationPath, "srno", "asc");

        Object.assign(response, mongoResponse[0]);
      }
    }
    return response;
  }

  static async getAllCareerDetails({ onlyActive = true } = {}) {
    const paramValue = Utils.$isValid(onlyActive) && onlyActive ? 1 : 0;
    const result = await Db.instance().execute("GetAllCareers", [
      { name: "onlyActive", value: paramValue },
    ]);
    return Utils.$isValidArray(result) && Utils.$isValidArray(result[0])
      ? result[0]
      : null;
  }

  static async createCareerCategory({ categoryDetails, userId } = {}) {
    if (!Utils.$isValidString(categoryDetails.categoryName)) return false;
    const params = await Utils.$getParamsFromObj(categoryDetails);
    params.push({ name: "userId", value: userId });
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateCareerCategory",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async createCareerSkillCategory({
    skillCategoryDetails,
    userId,
  } = {}) {
    if (!Utils.$isValidString(skillCategoryDetails.categoryName)) return false;
    const params = await Utils.$getParamsFromObj(skillCategoryDetails);
    params.push({ name: "userId", value: userId });
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateCareerSkillCategory",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async createCareerSkill({ careerSkillDetails, userId } = {}) {
    if (!Utils.$isValidString(careerSkillDetails.name)) return false;
    const params = await Utils.$getParamsFromObj(careerSkillDetails);
    params.push({ name: "userId", value: userId });
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateCareerSkill",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async createCareerExam({ examDetails, userId } = {}) {
    if (!Utils.$isValidString(examDetails.examName)) return false;
    const params = await Utils.$getParamsFromObj(examDetails);
    params.push({ name: "userId", value: userId });
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateExam",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async createCompany({
    companyDetailsId,
    companyName,
    companyDescription,
    isImageUpdated,
    isActive,
    companyLogo,
    userId,
  } = {}) {
    if (!Utils.$isValid(companyName)) return false;
    let companyLogoUrl = null;
    if (
      Boolean(Utils.$convertToInt(isImageUpdated)) &&
      Utils.$isValidJson(companyLogo) &&
      Utils.$isValidImgExt(companyLogo.mimetype.split("/")[1])
    ) {
      const extension = companyLogo.originalname.split(".").pop();
      const companyLogoName = await Utils.$generateFileName({
        imageType: "CompanyLogo",
        imageId: Utils.$getCleanString(companyName),
        randomize: true,
        extension,
      });
      companyLogoUrl = await Azure.uploadFile({
        fileName: companyLogoName,
        fileStream: companyLogo.buffer,
        fileType: Utils.$getContentType(extension),
        containerName: baseConfig.azure.containerConfig.clCompanyLogo,
      });
    }
    let params = [
      { name: "companyDetailsId", value: companyDetailsId },
      { name: "companyName", value: companyName },
      { name: "companyDescription", value: companyDescription },
      { name: "isImageUpdated", value: isImageUpdated },
      { name: "isActive", value: isActive },
      { name: "companyLogoUrl", value: companyLogoUrl },
      { name: "userId", value: userId },
    ];
    params = Utils.$nullifyParams(params);
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateCareerCompany",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async deactivateCareer({ careerId, userId } = {}) {
    if (!Utils.$isValid(careerId)) return false;
    const params = await Utils.$getParamsFromArgs(arguments);
    const outputParam = { name: "isSucessfullyUpdated" };
    const result = await Db.instance().execute(
      "DeactivateCareer",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async createFamousPersonality({
    personalityId,
    firstName,
    lastName,
    isImageUpdated,
    isActive,
    personImage,
    userId,
  } = {}) {
    if (!Utils.$isValid(firstName)) return false;
    let personImgUrl = null;
    if (
      Boolean(Utils.$convertToInt(isImageUpdated)) &&
      Utils.$isValidJson(personImage) &&
      Utils.$isValidImgExt(personImage.mimetype.split("/")[1])
    ) {
      const personImgName = await Utils.$generateFileName({
        imageType: "FamousPersonality",
        imageId: Utils.$getCleanString(firstName),
        randomize: true,
        extension: personImage.originalname.split(".").pop(),
      });
      personImgUrl = await Azure.uploadFile({
        fileName: personImgName,
        fileStream: personImage.buffer,
        containerName: baseConfig.azure.containerConfig.clFamousPersonality,
      });
    }
    let params = [
      { name: "personalityId", value: personalityId },
      { name: "firstName", value: firstName },
      { name: "lastName", value: lastName },
      { name: "isImageUpdated", value: isImageUpdated },
      { name: "isActive", value: isActive },
      { name: "personImgUrl", value: personImgUrl },
      { name: "userId", value: userId },
    ];
    params = Utils.$nullifyParams(params);
    const outputParam = { name: "isUpsertSucessful" };
    const result = await Db.instance().execute(
      "CreateCareerFamousPersonality",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }

  static async getBulkUploadCSVTemplate() {
    const templateData = await Utils.$getTemplateMetaDataByCode({
      templateCode: "CAREERBULKTEMPFILE",
    });
    return Utils.$isValidJson(templateData) ? templateData?.TemplateUrl : null;
  }

  static async uploadBulkUploadTemplate({ templateFile, userId } = {}) {
    if (
      !Utils.$isValidJson(templateFile) ||
      !Utils.$isValid(templateFile.buffer) ||
      templateFile.mimetype != "text/csv"
    ) {
      return false;
    }

    const uploadedUrl = await Azure.uploadFile({
      fileName: "TemplateBulkUploadCareer.csv",
      fileStream: templateFile.buffer,
      fileType: Utils.$getContentType("csv"),
      containerName: baseConfig.azure.containerConfig.clTemplateFiles,
    });

    if (!Utils.$isValid(uploadedUrl)) return false;

    await Db.instance().query(
      "UPDATE [dbo].[MLTemplate] SET TemplateUrl=?, LastUpdatedOn=CURRENT_TIMESTAMP, LastUpdatedBy=? WHERE TemplateCode=?",
      [uploadedUrl, userId, "CAREERBULKTEMPFILE"]
    );

    return true;
  }

  static async markCareerAsPopular({ careerId, userId } = {}) {
    let response = false;
    if (!Utils.$isValid(careerId)) return response;
    const params = await Utils.$getParamsFromArgs(arguments);
    const outputParam = { name: "isSuccessfullyUpdated" };
    const result = await Db.instance().execute(
      "MarkCareerAsPopular",
      params,
      outputParam
    );
    response = Utils.$checkRowsUpdated(result, outputParam.name);
    return response;
  }

  static async getSearchResults({ searchItem } = {}) {
    if (!Utils.$isValidString(searchItem)) return null;
    const apiKey = await AzureVault.getSecret("azureCognitiveSearchApiKey");

    // Request body
    const reqBody = JSON.stringify({
      search: searchItem,
      queryType: "semantic",
      semanticConfiguration: "career-semantic",
      captions: "extractive",
      answers: "extractive|count-3",
    });
    const searchConfig = {
      method: "post",
      url: "https://aisearchserv-i4e.search.windows.net/indexes/i4e-career-autocomplete/docs/search.post.search?api-version=2024-07-01",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      data: reqBody,
    };

    // Fetch the response
    let response = null;
    try {
      response = await axios.request(searchConfig);
    } catch (err) {
      Logger.error("Error fetching congnitive search results : ", err);
      return null;
    }
    if (
      !Utils.$isValidJson(response) ||
      response.status !== 200 ||
      !Utils.$isValidArray(response?.data?.value)
    ) {
      Logger.info("No valid response found from azure congnitive search api.");
      return null;
    }

    // Filter results
    const searchResults = response.data.value.map((item) => ({
      CareerID: item.CareerID,
      Name: item.Name,
      SlugUrl: item.SlugUrl,
    }));
    return searchResults;
  }

  static async getAutoCompleteResults({ searchItem } = {}) {
    if (!Utils.$isValidString(searchItem)) return null;
    const apiKey = await AzureVault.getSecret("azureCognitiveSearchApiKey");

    // Request body
    const reqBody = JSON.stringify({
      search: searchItem,
      suggesterName: "career-ac",
      fuzzy: true,
      top: 5,
    });
    const searchConfig = {
      method: "post",
      url: "https://aisearchserv-i4e.search.windows.net/indexes/i4e-career-autocomplete/docs/autocomplete?api-version=2024-07-01",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      data: reqBody,
    };

    // Fetch the response
    let response = null;
    try {
      response = await axios.request(searchConfig);
    } catch (err) {
      Logger.error(
        `Error fetching congnitive auto complete search results : ${err}`
      );
      return null;
    }
    if (
      !Utils.$isValidJson(response) ||
      response.status !== 200 ||
      !Utils.$isValidArray(response?.data?.value)
    ) {
      Logger.info(
        "No valid response found from azure congnitive auto complete search api."
      );
      return null;
    }

    const searchResults = response.data.value.map((item) => ({
      Name: item.text,
      Value: item.queryPlusText,
    }));
    return searchResults;
  }

  // **************************************************************
  // BULK UPLOAD CAREERS
  // **************************************************************

  static async bulkUploadCareers({ csvFile, userId } = {}) {
    if (!Utils.$isValid(csvFile)) return null;

    const workbook = xlsx.read(csvFile, { type: "buffer", raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    const response = [];

    for (const row of rows) {
      const result = {};
      const seenHeaders = {};

      headers.forEach((header, index) => {
        if (!header) return; // Skip empty headers

        // Handle repeated headers
        if (seenHeaders[header]) {
          // Convert single value to array if necessary
          if (!Array.isArray(result[header])) {
            result[header] = [result[header]];
          }
          // Add the new value as an object
          if (row[index] && row[index] !== "-" && row[index].trim()) {
            result[header].push({ value: row[index] });
          }
        } else {
          // Store the first occurrence of the header
          if (row[index] && row[index] !== "-") {
            result[header] = { value: row[index] };
          } else {
            result[header] = [];
          }
          seenHeaders[header] = true;
        }
      });

      const resultedRowData = await this.processCareerLibraryData(
        result,
        userId
      );
      Logger.info("Bulk Upload process career library completed");

      // update personalities
      resultedRowData.personalities = await this.createPersonalitiesId(
        resultedRowData.personalities,
        userId
      );
      Logger.info("Bulk Upload personality ids created");

      // update company details
      resultedRowData.companies = await this.createCompanyDetailsId(
        resultedRowData.companies,
        userId
      );
      Logger.info("Bulk Upload company detail ids created");

      // update exam
      resultedRowData.exams = await this.createExamId(
        resultedRowData.exams,
        userId
      );
      Logger.info("Bulk Upload exam ids created");

      // update colleges
      resultedRowData.colleges = await this.createCollegeId(
        resultedRowData.colleges,
        userId
      );
      Logger.info("Bulk Upload college ids created");

      // update career category
      const newCareerCluster = await this.createCareerCluster(
        resultedRowData.career_cluster,
        userId
      );
      Logger.info("Bulk Upload career cluster id created");

      resultedRowData.career_cluster = newCareerCluster.CareerCategoryID;

      if (resultedRowData?.earnings?.length > 0) {
        resultedRowData.avgSalary =
          resultedRowData?.earnings[0]?.minRange?.value || 0;
      }

      const reqObj = {
        careerName: resultedRowData.jobs,
        metaTitle: resultedRowData.meta_title,
        metaDescription: resultedRowData.meta_description,
        shortDescription: resultedRowData.shortDescription,
        avgSalary: resultedRowData.avgSalary,
        overview: resultedRowData.page_content,
        jobTitle: resultedRowData.jobs,
        description: resultedRowData.description,
        strength: resultedRowData.strengths,
        weakness: resultedRowData.weakness,
        otherNames: resultedRowData.also_known_as,
        progression: resultedRowData.career_progression_path,
        expectedRange: resultedRowData.earnings,
        responsibility: resultedRowData.responsibilities,
        workContext: resultedRowData.work_context,
        youtubeLink: resultedRowData.youtube,
        careerCategoryId: resultedRowData.career_cluster,
        companyIds:
          resultedRowData?.companies && resultedRowData?.companies?.length > 0
            ? resultedRowData?.companies
            : [],
        examIds:
          resultedRowData?.exams && resultedRowData?.exams?.length > 0
            ? resultedRowData?.exams
            : [],
        personalityIds:
          resultedRowData?.personalities &&
          resultedRowData?.personalities?.length > 0
            ? resultedRowData?.personalities
            : [],
        instituteIds:
          resultedRowData?.colleges && resultedRowData?.colleges?.length > 0
            ? resultedRowData?.colleges
            : [],
        careerSkillIds:
          resultedRowData?.skills && resultedRowData?.skills?.length > 0
            ? resultedRowData?.skills
            : [],
        educationPath:
          resultedRowData?.education_path &&
          resultedRowData?.education_path?.length > 0
            ? resultedRowData?.education_path
            : [],
      };
      Logger.info(
        "Bulk Upload request object created for uploading in database"
      );

      await this.createCareer({ careerDetails: reqObj, userId: userId });
      Logger.info("Bulk Upload request object uploaded successfully");

      response.push(resultedRowData);
    }

    return response;
  }

  static async createPersonalitiesId(personalities, userId) {
    const newPersonalitiesId = [];
    if (Utils.$isValidArray(personalities)) {
      for (const person of personalities) {
        const personValue = Utils.$replaceSingleQuotes(person);
        let dbPersonalityResult = await Db.instance().query(
          "SELECT TOP 1 * FROM dbo.ESDPersonalities where [FirstName]=? and IsActive=1",
          [personValue],
          true
        );
        if (!Utils.$isValidJson(dbPersonalityResult)) {
          const reqObj = {
            personalityId: null,
            firstName: person.trim(),
            lastName: null,
            isImageUpdated: 0,
            isActive: 1,
            personImage: null,
            userId: userId,
          };
          await this.createFamousPersonality(reqObj);
          const personVal = Utils.$replaceSingleQuotes(person);
          dbPersonalityResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDPersonalities where [FirstName]=? and IsActive=1",
            [personVal],
            true
          );
        }
        newPersonalitiesId.push(dbPersonalityResult.PersonalityID);
      }
    }
    return newPersonalitiesId;
  }

  static async createCompanyDetailsId(companies, userId) {
    const newCompanyDetailsId = [];
    if (Utils.$isValidArray(companies)) {
      for (const company of companies) {
        // const companyVal = company.replace(/'/g, "''").trim();
        const companyVal = Utils.$replaceSingleQuotes(company);
        let dbCompanyResult = await Db.instance().query(
          "SELECT TOP 1 * FROM dbo.ESDCompanyDetails where [CompanyName]=? and IsActive=1",
          [companyVal],
          true
        );
        if (!Utils.$isValidJson(dbCompanyResult)) {
          const reqObj = {
            companyDetailsId: null,
            companyName: company.trim(),
            companyDescription: null,
            isImageUpdated: 0,
            isActive: 1,
            companyLogo: null,
            userId: userId,
          };
          await this.createCompany(reqObj);
          dbCompanyResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDCompanyDetails where [CompanyName]=? and IsActive=1",
            [companyVal],
            true
          );
        }
        newCompanyDetailsId.push(dbCompanyResult.CompanyDetailsID);
      }
    }
    return newCompanyDetailsId;
  }

  static async createExamId(exams, userId) {
    const newExamIds = [];
    if (Utils.$isValidArray(exams)) {
      for (const exam of exams) {
        const examVal = Utils.$replaceSingleQuotes(exam);
        let dbExamResult = await Db.instance().query(
          "SELECT TOP 1 * FROM dbo.ESDExam where [ExamName]=? and IsActive=1",
          [examVal],
          true
        );
        if (!Utils.$isValidJson(dbExamResult)) {
          const reqObj = {
            examDetails: {
              examId: null,
              examCode: null,
              examName: exam.trim(),
              examTypeId: null,
              educationLevelId: null,
              isActive: 1,
            },
            userId: userId,
          };
          await this.createCareerExam(reqObj);
          const examValue = Utils.$replaceSingleQuotes(exam);
          dbExamResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDExam where [ExamName]=? and IsActive=1",
            [examValue],
            true
          );
        }
        newExamIds.push(dbExamResult.ExamId);
      }
    }
    return newExamIds;
  }

  static async createCollegeId(colleges, userId) {
    // TODO: Replace the below cityId with query
    const cityId = 249;
    const newCollegeIds = [];
    if (Utils.$isValidArray(colleges)) {
      for (const institute of colleges) {
        const instituteVal = Utils.$replaceSingleQuotes(institute.college);
        let dbCollegeResult = await Db.instance().query(
          "SELECT TOP 1 * FROM dbo.ESDInstitute where [InstituteName]=? and IsActive=1",
          [instituteVal],
          true
        );
        if (!Utils.$isValidJson(dbCollegeResult)) {
          const reqObj = {
            instituteCode: null,
            instituteName: institute.college.trim(),
            instituteTypeId: 2,
            universityId: null,
            addressLine1: null,
            addressLine2: null,
            addressLine3: null,
            cityId: cityId,
            postalCode: null,
            geoMapLocation: null,
            instituteImage: null,
            userId: userId,
          };
          const instituteValue = Utils.$replaceSingleQuotes(institute.college);
          dbCollegeResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDInstitute where [InstituteName]=? and IsActive=1",
            [instituteValue],
            true
          );
        }
        newCollegeIds.push(dbCollegeResult.InstituteID);
      }
    }
    return newCollegeIds;
  }

  static async createCareerCluster(career_cluster, userId) {
    const careerVal = Utils.$replaceSingleQuotes(career_cluster);
    let dbCareerCategoryResult = await Db.instance().query(
      "SELECT TOP 1 * FROM dbo.ESDCareerCategory where [CategoryName]=? and IsActive=1",
      [careerVal],
      true
    );
    if (!Utils.$isValidJson(dbCareerCategoryResult)) {
      const reqObj = {
        categoryDetails: {
          careerCategoryId: null,
          categoryCode: null,
          categoryName: career_cluster.trim(),
          isActive: 1,
        },
        userId: userId,
      };
      await this.createCareerCategory(reqObj);
      const careerVal = Utils.$replaceSingleQuotes(career_cluster);
      dbCareerCategoryResult = await Db.instance().query(
        "SELECT TOP 1 * FROM dbo.ESDCareerCategory where [CategoryName]=? and IsActive=1",
        [careerVal],
        true
      );
    }
    return dbCareerCategoryResult;
  }

  static getCareerSkillCategoryName(careerSkillCategory) {
    if (!Utils.$isValidString) return careerSkillCategory;
    let resultCareerSkill = careerSkillCategory.split("_");
    if (resultCareerSkill.length === 0) {
      return careerSkillCategory;
    }
    const splitSkillCategory1 = Utils.$getCamelCaseStr({
      string: resultCareerSkill[0],
      upperCase: true,
    });
    const splitSkillCategory2 = Utils.$getCamelCaseStr({
      string: resultCareerSkill[1],
      upperCase: true,
    });
    return splitSkillCategory1 + " " + splitSkillCategory2;
  }

  static async processCareerLibraryData(careerLibraryData, userId) {
    const splitTypes = {
      strings: [
        "career_cluster",
        "jobs",
        "page_content",
        "description",
        "meta_title",
        "meta_description",
        "shortDescription",
      ],
      stringSplit: [
        "also_known_as",
        "strengths",
        "weakness",
        "colleges",
        "exams",
        "personalities",
        "career_progression_path",
        "companies",
        "youtube",
        "keywords",
      ],
      titleDescSplit: ["responsibilities", "work_context"],
    };
    splitTypes.strings.forEach((el) => {
      careerLibraryData[el] = careerLibraryData[el]?.value || "";
    });
    splitTypes.stringSplit.forEach((el) => {
      if (Utils.$isValidString(careerLibraryData[el].value)) {
        const splitCareerData = String(careerLibraryData[el].value).replace(
          /,\s*\n/g,
          "\n"
        );
        if (splitCareerData) {
          careerLibraryData[el] = this.splitStringToArray(splitCareerData, el);
        } else {
          careerLibraryData[el] = [];
        }
      } else {
        careerLibraryData[el] = [];
      }
    });
    splitTypes.titleDescSplit.forEach((el) => {
      if (Utils.$isValidString(careerLibraryData[el].value)) {
        let newCareerDataArray = [];
        const splitCareerData = String(careerLibraryData[el].value).replace(
          /,\s*\n/g,
          "\n"
        );
        if (splitCareerData) {
          const splitCareerDataArray = splitCareerData.split("\n");
          if (splitCareerDataArray?.length > 0) {
            splitCareerDataArray.forEach((careerItem) => {
              let splitCareerItem = null;
              if (el === "responsibilities") {
                splitCareerItem = this.splitStringToTitleValue(
                  careerItem,
                  "title",
                  "description",
                  "-"
                );
              } else {
                splitCareerItem = this.splitStringToTitleValue(careerItem);
              }
              if (splitCareerItem) {
                newCareerDataArray.push(splitCareerItem);
              }
            });
          }
          careerLibraryData[el] = [...newCareerDataArray];
        } else {
          careerLibraryData[el] = [];
        }
      } else {
        careerLibraryData[el] = [];
      }

      // }
    });
    careerLibraryData.earnings = await this.getExpectedRange(
      careerLibraryData.earnings.value
    );
    careerLibraryData.education_path = await this.createEducationPath(
      careerLibraryData.education_path
    );
    careerLibraryData.colleges = await this.createColleges(
      careerLibraryData.colleges
    );
    careerLibraryData.skills = await this.createSkillsData(
      careerLibraryData.skills.value,
      userId
    );
    return careerLibraryData;
  }

  static async createSkillsData(careerSkill, userId) {
    const newCareerSkillArray = Utils.$splitString(careerSkill, "\n");
    const totalSkillIds = [];
    for (const parentSkill of newCareerSkillArray) {
      if (!parentSkill) continue;
      let parentSkillId = null;
      const parentSkillSplit = Utils.$splitString(parentSkill, "||");
      const parentSkillVal = Utils.$replaceSingleQuotes(parentSkillSplit[0]);
      let dbSkillCategoryResult = await Db.instance().query(
        "SELECT TOP 1 * FROM dbo.ESDCareerSkillCategory where [Name]=? and IsActive=1",
        [parentSkillVal],
        true
      );
      if (!Utils.$isValidJson(dbSkillCategoryResult)) {
        const newSkillCategoryObject = {
          careerSkillCategoryId: null,
          categoryCode: null,
          categoryName: parentSkillSplit[0],
          description: null,
          parentCareerSkillCategoryId: null,
          isActive: 1,
        };
        await this.createCareerSkillCategory({
          skillCategoryDetails: newSkillCategoryObject,
          userId: userId,
        });
        const parentSkillVal = Utils.$replaceSingleQuotes(parentSkillSplit[0]);
        dbSkillCategoryResult = await Db.instance().query(
          "SELECT TOP 1 * FROM dbo.ESDCareerSkillCategory where [Name]=? and IsActive=1",
          [parentSkillVal],
          true
        );
      }
      parentSkillId = dbSkillCategoryResult.CareerSkillCategoryID;
      const subParentSkillSplit = Utils.$splitString(parentSkillSplit[1], "|");
      for (const subParentSkill of subParentSkillSplit) {
        if (!subParentSkill) continue;
        let subParentSkillId = null;
        let skillItems = [];
        const subSkillItemSplit = Utils.$splitString(subParentSkill, ":");
        if (subSkillItemSplit.length > 1) {
          skillItems = subSkillItemSplit[1];
          const subSkillItemVal = Utils.$replaceSingleQuotes(
            subSkillItemSplit[0]
          );
          let dbSubParentSkillCategoryResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDCareerSkillCategory where [Name]=? and IsActive=1",
            [subSkillItemVal],
            true
          );
          if (!Utils.$isValidJson(dbSubParentSkillCategoryResult)) {
            const newSkillCategoryObject = {
              careerSkillCategoryId: null,
              categoryCode: null,
              categoryName: subSkillItemSplit[0],
              description: null,
              parentCareerSkillCategoryId: parentSkillId,
              isActive: 1,
            };
            await this.createCareerSkillCategory({
              skillCategoryDetails: newSkillCategoryObject,
              userId: userId,
            });
            const subSkillItemVal = Utils.$replaceSingleQuotes(
              subSkillItemSplit[0]
            );
            dbSubParentSkillCategoryResult = await Db.instance().query(
              "SELECT TOP 1 * FROM dbo.ESDCareerSkillCategory where [Name]=? and IsActive=1",
              [subSkillItemVal],
              true
            );
          }
          subParentSkillId =
            dbSubParentSkillCategoryResult.CareerSkillCategoryID;
        } else {
          skillItems = subSkillItemSplit[0];
        }
        const skillItemSplit = Utils.$splitString(skillItems, ",");
        for (const skill of skillItemSplit) {
          if (!skill) continue;
          const skillVal = Utils.$replaceSingleQuotes(skill);
          let dbSkillResult = await Db.instance().query(
            "SELECT TOP 1 * FROM dbo.ESDCareerSkills where [Name]=? and IsActive=1",
            [skillVal],
            true
          );
          if (!Utils.$isValidJson(dbSkillResult)) {
            const reqSkillBody = {
              careerSkillCategoryId: subParentSkillId
                ? subParentSkillId
                : parentSkillId,
              careerSkillId: null,
              name: skill,
              description: null,
              code: null,
              isActive: 1,
            };
            await this.createCareerSkill({
              careerSkillDetails: reqSkillBody,
              userId: userId,
            });
            const skillVal = Utils.$replaceSingleQuotes(skill);
            dbSkillResult = await Db.instance().query(
              "SELECT TOP 1 * FROM dbo.ESDCareerSkills where [Name]=? and IsActive=1",
              [skillVal],
              true
            );
          }
          totalSkillIds.push(dbSkillResult.CareerSkillID);
        }
      }
    }
    return totalSkillIds;
  }

  static createColleges(collegeData) {
    if (collegeData && collegeData?.length > 0) {
      const newCollegeArray = [];
      collegeData?.forEach((el) => {
        const newCollegeSplitVal = Utils.$splitString(el, ",");
        const cityData = newCollegeSplitVal[1] ? newCollegeSplitVal[1] : "";
        const newCollegeObj = {
          college: newCollegeSplitVal[0] + ", " + cityData,
          city: cityData,
        };
        newCollegeArray.push(newCollegeObj);
      });
      return newCollegeArray;
    } else {
      return [];
    }
  }

  static createEducationPath(educationPath) {
    let newEducationPathArray = [];
    educationPath.forEach((path, index) => {
      const newPathObj = [];
      const splitPathArray = Utils.$splitString(path.value, "\n");
      splitPathArray.forEach((educationData) => {
        if (educationData) {
          const splitEducationItem = Utils.$splitString(educationData, "-");
          const newSplitEducationItemObject = {};
          switch (splitEducationItem[0].trim()) {
            case "10th": {
              newSplitEducationItemObject.stream = {
                inputType: "text",
                value: "10th",
              };
              newSplitEducationItemObject.certification = {
                inputType: "text",
                value: splitEducationItem[1]?.trim() || "",
              };
              newSplitEducationItemObject.certSpecification = {
                inputType: "text",
                value: null,
              };
              newSplitEducationItemObject.icon = {
                inputType: "image",
                value: null,
              };
              break;
            }
            case "12th": {
              newSplitEducationItemObject.stream = {
                inputType: "text",
                value: "12th",
              };
              newSplitEducationItemObject.certification = {
                inputType: "text",
                value: splitEducationItem[1]?.trim()
                  ? splitEducationItem[1]?.trim()
                  : "",
              };
              newSplitEducationItemObject.certSpecification = {
                inputType: "text",
                value: null,
              };
              newSplitEducationItemObject.icon = {
                inputType: "image",
                value: null,
              };
              break;
            }
            default: {
              newSplitEducationItemObject.stream = {
                inputType: "text",
                value: splitEducationItem[0].trim(),
              };
              newSplitEducationItemObject.certification = {
                inputType: "text",
                value: splitEducationItem[1]?.trim()
                  ? splitEducationItem[1]?.trim()
                  : null,
              };
              newSplitEducationItemObject.certSpecification = {
                inputType: "text",
                value: null,
              };
              newSplitEducationItemObject.icon = {
                inputType: "image",
                value: null,
              };
              break;
            }
          }
          newPathObj.push(newSplitEducationItemObject);
        }
      });
      const resultEducationPathObj = {
        details: newPathObj,
        srno: index,
      };
      newEducationPathArray.push(resultEducationPathObj);
    });
    return newEducationPathArray;
  }

  static getExpectedRange(expectedRangeData) {
    if (!Utils.$isValidString(expectedRangeData)) return null;
    const resultedEarnings = [];
    const splitEarningsValue = expectedRangeData.split("\n");
    if (splitEarningsValue?.length === 1) {
      resultedEarnings.push({
        title: {
          inputType: "text",
          value: splitEarningsValue[0] ? splitEarningsValue[0] : null,
        },
      });
    } else if (splitEarningsValue?.length > 1);
    {
      splitEarningsValue.forEach((earningsItem) => {
        if (Utils.$splitString(earningsItem)) {
          let newEarningsObj = {};
          const newExpectedEarningsArray = Utils.$splitString(
            earningsItem,
            ":"
          );
          newEarningsObj.title = {
            inputType: "text",
            value: newExpectedEarningsArray[0],
            size: 4,
          };
          const splitEarning = Utils.$splitString(
            newExpectedEarningsArray[1],
            "-"
          );
          if (splitEarning?.length > 0) {
            newEarningsObj.minRange = {
              inputType: "text",
              value: splitEarning[0],
              size: 4,
            };
            let newEarningsMax = null;
            if (splitEarning[1]) {
              newEarningsMax = Utils.$replaceSingleQuotes(
                splitEarning[1],
                "per ",
                "/"
              );
            }
            newEarningsObj.maxRange = {
              inputType: "text",
              value: newEarningsMax ? newEarningsMax : null,
              size: 4,
            };
          }
          resultedEarnings.push(newEarningsObj);
        }
      });
    }
    return resultedEarnings;
  }

  static splitToStringVal(data) {
    if (!Utils.$isValidString(data)) return null;
    let newResultedObj = {
      inputType: "text",
      value: data,
    };
    return newResultedObj;
  }

  static splitStringToArray(careerData, careerDataType) {
    if (!Utils.$isValidString(careerData)) return null;
    let newResultedCareerArray = null;
    switch (careerDataType) {
      case "also_known_as": {
        newResultedCareerArray = Utils.$splitString(careerData, ",");
        if (newResultedCareerArray) {
          return newResultedCareerArray;
        } else {
          return [];
        }
      }
      case "career_progression_path": {
        newResultedCareerArray = Utils.$splitString(careerData, "\n");
        const progressionArray = [];
        newResultedCareerArray.forEach((el) =>
          progressionArray.push({
            value: el,
          })
        );
        return progressionArray;
      }
      case "youtube": {
        newResultedCareerArray = Utils.$splitString(careerData, ",");
        if (newResultedCareerArray) {
          const youtubeArray = [];
          newResultedCareerArray.forEach((el) => {
            if (el && el?.trim()) {
              youtubeArray.push({
                link: el?.trim() ? el?.trim() : null,
                image: null,
              });
            }
          });
          return youtubeArray;
        } else {
          return [];
        }
      }
      default:
        if (!careerData) return [];
        const newCareerString = Utils.$replaceSingleQuotes(
          careerData,
          ",",
          " "
        );
        newResultedCareerArray = Utils.$splitString(newCareerString, "\n");
        return newResultedCareerArray;
    }
  }

  static splitStringToTitleValue(
    careerData,
    objKey1 = "title",
    objKey2 = "description",
    splitValFrom = ":"
  ) {
    if (!Utils.$isValidString(careerData)) return null;
    let newCareerArray = Utils.$splitString(careerData, splitValFrom);
    if (newCareerArray.length > 0) {
      const newCareerObj = {
        [objKey1]: {
          inputType: "text",
          value: newCareerArray[0],
        },
        [objKey2]: {
          inputType: "text",
          value: newCareerArray[1],
        },
      };
      return newCareerObj;
    } else {
      return null;
    }
  }

  static bindingDataInputTypeValue(data) {
    const newResultedArray = data.map((el) => {
      return {
        inputType: "text",
        value: el,
      };
    });
    return newResultedArray;
  }

  static async updateCareerCategoryDescription({
    careerCategoryId,
    careerCategoryDescription,
    userId,
  } = {}) {
    if (
      !Utils.$isValid(careerCategoryId) ||
      !Utils.$isValidString(careerCategoryDescription)
    ) {
      return null;
    }
    const extension = "html";
    const uploadedCareerCategoryDescription = await Azure.uploadFile({
      fileName: `CareerCategory-${careerCategoryId}-Description.${extension}`,
      fileStream: Buffer.from(careerCategoryDescription, "utf8"),
      fileType: Utils.$getContentType(extension),
      containerName:
        baseConfig.azure.containerConfig.clCareerCategoryDescription,
    });
    const params = [
      { name: "careerCategoryId", value: careerCategoryId },
      {
        name: "careerCategoryDescription",
        value: uploadedCareerCategoryDescription,
      },
      { name: "userId", value: userId },
    ];
    const outputParam = { name: "isSuccessfullyUpdated" };
    const result = await Db.instance().execute(
      "UpdateCareerCategoryDescription",
      params,
      outputParam
    );
    return Utils.$checkRowsUpdated(result, outputParam.name);
  }
}
