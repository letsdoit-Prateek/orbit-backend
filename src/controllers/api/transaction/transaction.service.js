/* eslint-disable */
import TransactionModel from "../../../models/mongo/transaction";
import Utils from "../../../util/utils";
const mongoose = require('mongoose');
export default class TransactionService {
  static async getAllTranscationList({ status, type, fromDate, toDate, page, limit } = {}) {
    const filters = {};

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (fromDate && toDate) {
        filters.transactionDate = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate),
        };
    }

    const transactions = await TransactionModel.aggregate([
        { $match: filters },
        { $lookup: { from: 'UserDetails', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
        { $unwind: '$userDetails' },
        { $sort: { transactionDate: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
    ]);

    return Utils.$isValid(transactions) && transactions.length > 0 ? transactions: [{ message: "No Record Found" }]
  }

  static async getUserTranscationList({ userId, status, type, fromDate, toDate, page, limit } = {}) {
    const filters = { userId: new mongoose.Types.ObjectId(userId) };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (fromDate && toDate) {
        filters.transactionDate = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate),
        };
    }

    const transactions = await TransactionModel.aggregate([
        { $match: filters },
        { $sort: { transactionDate: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
    ]);
    return Utils.$isValid(transactions) && transactions.length > 0 ? transactions: [{ message: "No Record Found" }]
  }
}
