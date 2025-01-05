/* eslint-disable */
const { Schema, model } = require("mongoose");

const twilioSendGridLog = new Schema(
  {
    email: {
      type: String,
      required: [true, "Please specify this field"],
    },
    event: {
      type: String,
      required: [true, "Please specify this field"],
    },
    ip: {
      type: String,
    },
    response: {
      type: String,
    },
    sg_event_id: {
      type: String,
      required: [true, "Please specify this field"],
    },
    sg_message_id: {
      type: String,
      required: [true, "Please specify this field"],
    },
    "smtp-id": {
      type: String,
    },
    timestamp: {
      type: String,
      required: [true, "Please specify this field"],
    },
    tls: {
      type: Number,
    },
    attempt: {
      type: String,
    },
    send_at: {
      type: Number,
    },
    sg_content_type: {
      type: String,
    },
    sg_machine_open: {
      type: Boolean,
    },
    useragent: {
      type: String,
    },
    bounce_classification: {
      type: String,
    },
    type: {
      type: String,
    },
    reason: {
      type: String,
    },
    subject: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "twilioSendGridLog",
  },
);
twilioSendGridLog.index({ sg_message_id: 1, email: 1 }, { unique: true });

const TwilioSendGridLogModel = model("twilioSendGridLog", twilioSendGridLog);

export default TwilioSendGridLogModel;
