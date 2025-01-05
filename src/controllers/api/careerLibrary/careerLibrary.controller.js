/* eslint-disable */
import multer from "multer";
import sendResponse from "../../../util/responseSender";
import Utils from "../../../util/utils";
import Controller from "../../Controller";
import ControllerFactory from "../../ControllerFactory";
import CareerLibraryService from "./careerLibrary.service";

export default class CareerLibrary extends Controller {
  routes() {
    // Configure the route and function name
    const routingConfig = {
      post: {
        "/career": "createCareer",
        "/category": "createCareerCategory",
        "/skill/category": "createCareerSkillCategory",
        "/skill": "createCareerSkill",
        "/exam": "createCareerExam",
      },
      get: {
        "/metaData": "getCareerLibraryMetaData",
        "/category": "getAllCategoryCareers",
        "/career": "getCareerDetails",
        "/bulk-upload-template": "getBulkUploadCSVTemplate",
        "/career/search": "searchCareerLibraryData",
        "/career/autocompletion": "getAutoCompletionCareerResults",
      },
      put: { "/career": "updateCareer" },
      patch: {
        "/career": "deactivateCareer",
        "/career/popular": "markCareerAsPopular",
        "/career/category-description": "updateCareerCategoryDescription",
      },
    };
    return routingConfig;
  }

  registerOtherRoutes(router) {
    const upload = multer({ storage: multer.memoryStorage() });

    router.post(
      "/career/education-path",
      upload.any("fileList"),
      Controller.wrap(async (req, res) => {
        await CareerLibrary.createNewEducationPath({
          req,
          res,
        });
      })
    );

    router.post(
      "/career/youtube-link",
      upload.any("fileList"),
      Controller.wrap(async (req, res) => {
        await CareerLibrary.createNewYoutubeLink({
          req,
          res,
        });
      })
    );

    router.post(
      "/company",
      upload.single("companyLogo"),
      Controller.wrap(async (req, res) => {
        await CareerLibrary.createCompany({ req, res });
      })
    );

    router.post(
      "/personality",
      upload.single("personImage"),
      Controller.wrap(async (req, res) => {
        await CareerLibrary.createFamousPersonality({ req, res });
      })
    );

    router.post(
      "/bulk-upload",
      multer().single("csv"),
      Controller.wrap(async (req, res) =>
        CareerLibrary.bulkUploadCareers({ req: req, res: res })
      )
    );

    router.post(
      "/bulk-upload-template",
      multer().single("templateFile"),
      Controller.wrap(async (req, res) =>
        CareerLibrary.uploadBulkUploadTemplate({ req: req, res: res })
      )
    );
  }

  /**
   * @swagger
   * components:
   *   securitySchemes:
   *     TokenAuth:                  # Bearer Token (JWT) scheme
   *       type: http
   *       scheme: bearer
   *       description: Use a Bearer Token (JWT) to authenticate access to APIs.
   *     ClientIdAndSecretAuth:      # Client ID and Secret scheme
   *       type: apiKey
   *       in: header
   *       name: Authorization
   *       description: Use a Client ID and Secret for authentication.
   */

  // ****************************************************************************
  //                         CAREER LIBRARY CONTROLLER
  // ****************************************************************************

  // API TO GET THE CAREER LIBRARY META DATA
  /**
   * @swagger
   * /api/careerLibrary/metaData:
   *   get:
   *     summary: Get career library meta data.
   *     description: Get career library meta data.
   *     security:
   *      - TokenAuth: []
   *      - ClientIdAndSecretAuth: []
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Returns career library meta data.
   *       500:
   *         description: Server error occurred
   */
  static async getCareerLibraryMetaData({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.getCareerLibraryMetaData();
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE A NEW CAREER
  /**
   * @swagger
   * /api/careerLibrary/career/:
   *   post:
   *     summary: Create a new career.
   *     description: Create a new career.
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerName:
   *                 type: string
   *               metaTitle:
   *                 type: string
   *               metaDescription:
   *                 type: string
   *               careerCode:
   *                 type: string
   *               overview:
   *                 type: string
   *               jobTitle:
   *                 type: string
   *               strength:
   *                 type: array
   *                 items:
   *                    type: string
   *               weakness:
   *                 type: array
   *                 items:
   *                    type: string
   *               otherNames:
   *                 type: array
   *                 items:
   *                    type: string
   *               progression:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        color:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               expectedRange:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        minRange:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *                        maxRange:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               responsibility:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        description:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               workContext:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        description:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               youtubeLink:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        img:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        link:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               careerCategoryId:
   *                 type: array
   *                 items:
   *                    type: number
   *               careerSkillIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               instituteIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               examIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               companyIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               personalityIds:
   *                 type: array
   *                 items:
   *                    type: number
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Returns the created ID of the new career
   *       500:
   *         description: Server error occurred
   */
  static async createCareer({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.createCareer({
        careerDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE A NEW CAREER EDUCATION PATH
  /**
   * @swagger
   * /api/careerLibrary/career/education-path:
   *   post:
   *     summary: Create a new career education path.
   *     description: Create a new career education path.
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerId:
   *                 type: integer
   *               srno:
   *                 type: integer
   *               educationPath:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     stream:
   *                       type: object
   *                       properties:
   *                         inputType:
   *                           type: string
   *                         value:
   *                           type: string
   *                     certification:
   *                       type: object
   *                       properties:
   *                         inputType:
   *                           type: string
   *                         value:
   *                           type: string
   *                     certSpecification:
   *                       type: object
   *                       properties:
   *                         inputType:
   *                           type: string
   *                         value:
   *                           type: string
   *                     icon:
   *                       type: object
   *                       properties:
   *                         inputType:
   *                           type: string
   *                         value:
   *                           oneOf:
   *                             - type: string
   *                               description: Represents a string value (URL or identifier)
   *                               example: "http://example.com/image.png"
   *                             - type: object
   *                               properties:
   *                                 file:
   *                                   type: string
   *                                   format: binary
   *                               description: Represents a file object when the inputType is 'image'
   *                       description: The value associated with the inputType. Can be a string or an object representing a file.
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Returns true or false based on successful creation.
   *       500:
   *         description: Server error occurred
   */
  static async createNewEducationPath({ req, res } = {}) {
    try {
      const { educationPath, careerId, srno } = req.body;
      const result = await CareerLibraryService.uploadEducationPath({
        educationPath,
        careerId,
        srno,
        files: req.files,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE/ADD YOUTUBE LINKS FOR THE CAREER
  /**
   * @swagger
   * /api/careerLibrary/career/youtube-link:
   *   post:
   *     summary: Create a new career YouTube link.
   *     description: Create a new career YouTube link.
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerId:
   *                 type: integer
   *               youtubeLinks:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     thumbnailImgUrl:
   *                       type: object
   *                       properties:
   *                         inputType:
   *                           type: string
   *                           description: The type of input, can be 'url' or 'image'
   *                         value:
   *                           oneOf:
   *                             - type: string
   *                               description: Represents a string value (URL or identifier)
   *                               example: "http://example.com/image.png"
   *                             - type: object
   *                               properties:
   *                                 file:
   *                                   type: string
   *                                   format: binary
   *                               description: Represents a file object when the inputType is 'image'
   *                       description: The value associated with the inputType. Can be a string or an object representing a file.
   *                     url:
   *                       type: string
   *                       description: The URL of the YouTube video
   *                     value:
   *                       type: string
   *                       description: Additional value or description related to the YouTube link
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Returns true or false based on successful creation.
   *       500:
   *         description: Server error occurred.
   */
  static async createNewYoutubeLink({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.uploadYoutubeLinks({
        youtubeLinks: req.body.youtubeLink,
        careerId: req.body.careerId,
        files: req.files,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO GET ALL CAREERS IN A CAREER CATEGORY
  /**
   * @swagger
   * /api/careerLibrary/category:
   *   get:
   *     summary: Get all careers for the category.
   *     description: Get all careers for the category.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     parameters:
   *       - name: slug
   *         in: query
   *         description: slug-url
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async getAllCategoryCareers({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.getAllCategoryCareers({
        slug: req.query.slug,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO GET THE CAREER DETAILS BASED ON CAREER ID
  /**
   * @swagger
   * /api/careerLibrary/career:
   *   get:
   *     summary: Get career details.
   *     description: Get career details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     parameters:
   *       - name: slug
   *         in: query
   *         description: slug-url
   *         schema:
   *           type: string
   *       - name: queryFrom
   *         in: query
   *         description: query from
   *         schema:
   *           type: string
   *       - name: onlyActive
   *         in: query
   *         description: Only active records
   *         schema:
   *           type: boolean
   *           default: true
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async getCareerDetails({ req, res } = {}) {
    try {
      const onlyActive = Utils.$isValid(req?.query?.onlyActive)
        ? req.query.onlyActive
        : true;
      const result = await CareerLibraryService.getCareerDetails({
        slug: req?.query?.slug,
        onlyActive: Utils.$checkBoolString(`${onlyActive}`),
        queryFrom: req?.query?.queryFrom || "client",
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE OR UPDATE CAREER CATEGORY DETAILS
  /**
   * @swagger
   * /api/careerLibrary/category:
   *   post:
   *     summary: Create or update career category details.
   *     description: Create or update career category details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerCategoryId:
   *                 type: number
   *               categoryCode:
   *                 type: string
   *               categoryName:
   *                 type: string
   *               isActive:
   *                 type: number
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createCareerCategory({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.createCareerCategory({
        categoryDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE OR UPDATE CAREER SKILL CATEGORY
  /**
   * @swagger
   * /api/careerLibrary/skill/category:
   *   post:
   *     summary: Create or update career skill category details.
   *     description: Create or update career skill category details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerSkillCategoryId:
   *                 type: number
   *               categoryCode:
   *                 type: string
   *               categoryName:
   *                 type: string
   *               description:
   *                 type: string
   *               parentCareerSkillCategoryId:
   *                 type: number
   *               isActive:
   *                 type: number
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createCareerSkillCategory({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.createCareerSkillCategory({
        skillCategoryDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE OR UPDATE CAREER SKILL
  /**
   * @swagger
   * /api/careerLibrary/skill:
   *   post:
   *     summary: Create or update career skill details.
   *     description: Create or update career skill details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerSkillId:
   *                 type: number
   *               code:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               careerSkillCategoryId:
   *                 type: number
   *               isActive:
   *                 type: number
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createCareerSkill({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.createCareerSkill({
        careerSkillDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE OR UPDATE CAREER EXAM
  /**
   * @swagger
   * /api/careerLibrary/exam:
   *   post:
   *     summary: Create or update exam details.
   *     description: Create or update exam details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               examId:
   *                 type: number
   *               examCode:
   *                 type: string
   *               examName:
   *                 type: string
   *               examTypeId:
   *                 type: number
   *               educationLevelId:
   *                 type: number
   *               isActive:
   *                 type: number
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createCareerExam({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.createCareerExam({
        examDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO CREATE OR UPDATE CAREER COMPANY
  /**
   * @swagger
   * /api/careerLibrary/company:
   *   post:
   *     summary: Create or update company details.
   *     description: Create or update company details.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               companyDetailsId:
   *                 type: number
   *               companyName:
   *                 type: string
   *               companyDescription:
   *                 type: string
   *               isImageUpdated:
   *                 type: number
   *               isActive:
   *                 type: number
   *               companyLogo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createCompany({ req, res } = {}) {
    try {
      const {
        companyDetailsId,
        companyName,
        companyDescription,
        isImageUpdated,
        isActive,
      } = req.body;
      const result = await CareerLibraryService.createCompany({
        companyDetailsId,
        companyName,
        companyDescription,
        isImageUpdated,
        isActive,
        companyLogo: Utils.$isValid(req.file) ? req.file : null,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO ADD FAMOUS PERSONALITY
  /**
   * @swagger
   * /api/careerLibrary/personality:
   *   post:
   *     summary: Create or update famous personlity.
   *     description: Create or update famous personlity.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               personalityId:
   *                 type: number
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               isActive:
   *                 type: number
   *               isImageUpdated:
   *                 type: number
   *               personImage:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successful response of true of false
   *       500:
   *         description: Server error occurred
   */
  static async createFamousPersonality({ req, res } = {}) {
    try {
      const { personalityId, firstName, lastName, isActive, isImageUpdated } =
        req.body;
      const result = await CareerLibraryService.createFamousPersonality({
        personalityId,
        firstName,
        lastName,
        isImageUpdated,
        isActive,
        personImage: Utils.$isValid(req.file) ? req.file : null,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO BULK INSERT CAREERS
  /**
   * @swagger
   * /api/careerLibrary/bulk-upload:
   *   post:
   *     summary: Bulk upload career's data using template csv file.
   *     description: Bulk upload career's data using template csv file.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               templateFile:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async bulkUploadCareers({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.bulkUploadCareers({
        csvFile: req?.file?.buffer,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO UPDATE CAREER DETAILS
  /**
   * @swagger
   * /api/careerLibrary/career/:
   *   put:
   *     summary: Update career details.
   *     description: Update career details.
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerId:
   *                 type: integer
   *               isActive:
   *                 type: integer
   *               careerName:
   *                 type: string
   *               metaTitle:
   *                 type: string
   *               metaDescription:
   *                 type: string
   *               careerCode:
   *                 type: string
   *               overview:
   *                 type: string
   *               jobTitle:
   *                 type: string
   *               strength:
   *                 type: array
   *                 items:
   *                    type: string
   *               weakness:
   *                 type: array
   *                 items:
   *                    type: string
   *               otherNames:
   *                 type: array
   *                 items:
   *                    type: string
   *               progression:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        color:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               expectedRange:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        minRange:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *                        maxRange:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               responsibility:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        description:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               workContext:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        title:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        description:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               youtubeLink:
   *                  type: array
   *                  items:
   *                    type: object
   *                    properties:
   *                        img:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: integer
   *                        link:
   *                            type: object
   *                            properties:
   *                                inputType: string
   *                                value: string
   *                                size: interger
   *               careerCategoryId:
   *                 type: array
   *                 items:
   *                    type: number
   *               careerSkillIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               instituteIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               examIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               companyIds:
   *                 type: array
   *                 items:
   *                    type: number
   *               personalityIds:
   *                 type: array
   *                 items:
   *                    type: number
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Returns the created ID of the new career
   *       500:
   *         description: Server error occurred
   */
  static async updateCareer({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.updateCareer({
        careerDetails: req.body,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO DE-ACTIVATE/ACTIVATE CAREER
  /**
   * @swagger
   * /api/careerLibrary/career:
   *   patch:
   *     summary: Deactivate/activate a career.
   *     description: Deactivate/activate a career.
   *     tags: [Career Library]
   *     parameters:
   *       - name: careerId
   *         in: query
   *         description: ID of the career to deactivate/activate
   *         required: true
   *         schema:
   *           type: number
   *           minimum: 1
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async deactivateCareer({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.deactivateCareer({
        careerId: req.query.careerId,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // GET BULK UPLOAD CAREER'S CSV TEMPLATE
  /**
   * @swagger
   * /api/careerLibrary/bulk-upload-template:
   *   get:
   *     summary: Get bulk upload career's template csv.
   *     description: Get bulk upload career's template csv.
   *     security:
   *      - TokenAuth: []
   *      - ClientIdAndSecretAuth: []
   *     tags: [Career Library]
   *     responses:
   *       200:
   *         description: Sucessfull response
   *       500:
   *         description: Server error occurred
   */
  static async getBulkUploadCSVTemplate({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.getBulkUploadCSVTemplate();
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // UPLOAD BULK UPLOAD TEMPLATE
  /**
   * @swagger
   * /api/careerLibrary/bulk-upload-template:
   *   post:
   *     summary: Upload bulk upload career's template csv file.
   *     description: Upload bulk upload career's template csv file.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               templateFile:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async uploadBulkUploadTemplate({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.uploadBulkUploadTemplate({
        templateFile: req?.file,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO MARK CAREER AS POPULAR OR UN-POPULAR
  /**
   * @swagger
   * /api/careerLibrary/career/popular:
   *   patch:
   *     summary: Mark career as popular or un-popular.
   *     description: Mark career as popular or un-popular.
   *     tags: [Career Library]
   *     parameters:
   *       - name: careerId
   *         in: query
   *         description: ID of the career
   *         required: true
   *         schema:
   *           type: number
   *           minimum: 1
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async markCareerAsPopular({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.markCareerAsPopular({
        careerId: req?.query.careerId,
        userId: await Controller.getUserId({ req }),
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO SEARCH CAREER LIBRARY DATA
  /**
   * @swagger
   * /api/careerLibrary/career/search:
   *   get:
   *     summary: Search carreer library.
   *     description: Search carreer library.
   *     tags: [Career Library]
   *     parameters:
   *       - name: career
   *         in: query
   *         description: career name to search
   *         required: true
   *         schema:
   *           type: string
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async searchCareerLibraryData({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.getSearchResults({
        searchItem: req.query?.career,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO GET AUTO COMPLETION RESULTS/SUGGESTIONS OF CAREER'S
  /**
   * @swagger
   * /api/careerLibrary/career/autocompletion:
   *   get:
   *     summary: Get auto complete career's data.
   *     description: Get auto complete career's data.
   *     tags: [Career Library]
   *     parameters:
   *       - name: career
   *         in: query
   *         description: career name to auto complete
   *         required: true
   *         schema:
   *           type: string
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async getAutoCompletionCareerResults({ req, res } = {}) {
    try {
      const result = await CareerLibraryService.getAutoCompleteResults({
        searchItem: req.query?.career,
      });
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }

  // API TO UPDATE CAREER CATEGORY DESCRIPTION
  /**
   * @swagger
   * /api/careerLibrary/career/category-description:
   *   patch:
   *     summary: Update Career Category Description.
   *     description: Update Career Category Description.
   *     tags: [Career Library]
   *     security:
   *       - TokenAuth: []
   *       - ClientIdAndSecretAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               careerCategoryId:
   *                 type: integer
   *               careerCategoryDescription:
   *                 type: string
   *     responses:
   *       200:
   *         description: Successful response
   *       500:
   *         description: Server error occurred
   */
  static async updateCareerCategoryDescription({ req, res } = {}) {
    try {
      const { careerCategoryId, careerCategoryDescription } = req.body;
      const result = await CareerLibraryService.updateCareerCategoryDescription(
        {
          careerCategoryId,
          careerCategoryDescription,
          userId: await Controller.getUserId({ req }),
        }
      );
      sendResponse.success({ resData: result, res: res });
    } catch (error) {
      sendResponse.error({ error: error, res: res });
    }
  }
}

ControllerFactory.register(CareerLibrary);
