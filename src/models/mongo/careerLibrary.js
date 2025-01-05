/* eslint-disable */
const { Schema, model } = require("mongoose");

const FieldSchema = new Schema({
  inputType: { type: String },
  value: { type: Schema.Types.Mixed },
});

const EducationPathSchema = new Schema({
  stream: { type: FieldSchema },
  certification: { type: FieldSchema },
});

// CAREER_LIBRARY
const careerLibrarySchema = new Schema(
  {
    careerId: {
      type: Number,
      required: [true, "Please specify this field"],
    },
    metaTitle: {
      type: String,
      required: [true, "Please specify this field"],
    },
    metaDescription: {
      type: String,
      required: [true, "Please specify this field"],
    },
    overview: {
      type: String,
      required: [true, "Please specify overview"],
    },
    jobTitle: {
      type: String,
      required: [true, "Please specify Job Title"],
    },
    description: {
      type: String,
      required: [true, "Please specify Description"],
    },
    shortDescription: {
      type: String,
    },
    avgSalary: {
      type: String,
    },
    strength: {
      type: [String],
    },
    weakness: {
      type: [String],
    },
    otherNames: {
      type: [String],
    },
    progression: [
      {
        value: {
          type: String,
        },
      },
    ],
    educationPath: {
      type: [{ details: [EducationPathSchema], srno: { type: Number } }],
    },
    expectedRange: {
      type: [
        {
          title: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
          minRange: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
          maxRange: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
        },
      ],
    },
    responsibility: {
      type: [
        {
          title: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
          description: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
        },
      ],
    },
    workContext: {
      type: [
        {
          title: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
          description: {
            inputType: { type: String },
            value: { type: String },
            size: { type: Number },
          },
        },
      ],
    },
    youtubeLink: {
      type: [
        {
          link: {
            type: String,
          },
          image: {
            type: String,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
    collection: "CareerLibrary",
  }
);

const careerLibraryModel = model("careerLibrary", careerLibrarySchema);

export default careerLibraryModel;
