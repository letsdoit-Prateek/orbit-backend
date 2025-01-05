/* eslint-disable */
import express from "express";
import CareerLibraryController from "../controllers/api/careerLibrary/careerLibrary.controller";

const router = express.Router();
CareerLibraryController.create({ router });

module.exports = router;
