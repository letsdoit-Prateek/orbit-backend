/* eslint-disable */
import express from "express";
import AuthenticationController from "../controllers/api/authentication/authentication.controller.js"

const router = express.Router();
AuthenticationController.create({ router });

module.exports = router;
