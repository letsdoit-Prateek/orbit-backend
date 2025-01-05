/* eslint-disable */
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const TranscationDetailSchema = new Schema(
  {
    status: { type: String, enum: ['success', 'pending', 'failed'], required: true },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    transactionDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true },
  },
  {
    collection: "TransactionDetails",
    strict: true,
  }
);

const TransactionModel = model("Transaction", TranscationDetailSchema);

export default TransactionModel;
