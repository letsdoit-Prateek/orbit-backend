/* eslint-disable */
import express from "express";
import TransactionController from "../controllers/api/transaction/transaction.controller";

const router = express.Router();
TransactionController.create({ router });

module.exports = router;
