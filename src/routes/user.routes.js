/* eslint-disable */
import express from "express";
import UserController from "../controllers/api/user/user.controller.js";

const router = express.Router();
UserController.create({ router });

module.exports = router;
