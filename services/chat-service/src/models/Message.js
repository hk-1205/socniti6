const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },
    readBy: [{
      userId: String,
      readAt: Date,
    }],
  },
  { timestamps: true }
);

messageSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
