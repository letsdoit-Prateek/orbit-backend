/* eslint-disable */
const { Schema, model } = require("mongoose");

const TranscationDetailSchema = new Schema(
  {
    status: { type: String, enum: ['success', 'pending', 'failed'], required: true },
    type: { type: String, enum: ['debit', 'credit'], required: true },
    transactionDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    collection: "TransactionDetail",
    strict: true,
  }
);

const TransactionModel = model("Transaction", TranscationDetailSchema);

export default TransactionModel;
