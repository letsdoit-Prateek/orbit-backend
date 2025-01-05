/* eslint-disable */
import express from "express";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import AuthenticateRequest from "./middlewares/authMiddleware.js";
import standardizeResponse from "./middlewares/responseMiddleware.js";
const cors = require("cors");
const baseConfig = require("./config/baseConfig.json");
require("dotenv").config();

// Define the controllers
const controllers = [
  // "authentication",
  // "careerLibrary",
  "user",
  "transaction",
];

// Define and setup the express app
const app = express();
setupExpressApp({ app, controllers });

// Setup express app
function setupExpressApp({ app, controllers } = {}) {
  const dataLimit = 150;
  const customCss = baseConfig.swaggerCss;
  const swaggerDocs = swaggerJsDoc({
    swaggerDefinition: { openapi: "3.1.0", info: baseConfig.swaggerInfo },
    apis: controllers.map(
      (controller) => `src/controllers/api/${controller}/*.js`
    ),
  });
  app.use(cors());
  app.use(express.json({ limit: `${dataLimit}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${dataLimit}mb` }));
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocs, customCss));
  app.use(standardizeResponse);
  app.use(AuthenticateRequest.authenticateRequest);
  controllers.forEach((route) => {
    app.use(`/api/${route}`, require(`./routes/${route}.routes.js`));
  });
}

module.exports = app;
