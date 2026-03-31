const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    donorId: {
      type: String,
      required: true,
    },
    donorName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    item: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 1,
    },
    type: {
      type: String,
      enum: ["monetary", "item"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    message: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

donationSchema.index({ eventId: 1, createdAt: -1 });
donationSchema.index({ donorId: 1 });

module.exports = mongoose.model("Donation", donationSchema);
