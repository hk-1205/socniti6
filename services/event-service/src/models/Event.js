const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fullName: { type: String, default: "" },
    email: { type: String, default: "" },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    organizerId: { type: String, required: true },
    organizerName: { type: String, default: "" },
    locationName: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    maxParticipants: { type: Number, default: 50 },
    currentParticipants: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming"
    },
    donationNeeds: [
      {
        item: String,
        quantity: Number,
        fulfilled: { type: Number, default: 0 }
      }
    ],
    participants: [participantSchema],
    waitlist: [participantSchema],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
