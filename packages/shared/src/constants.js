const ROLES = {
  USER: "user",
  ORGANIZER: "organizer",
  ADMIN: "admin"
};

const EVENT_STATUS = {
  UPCOMING: "upcoming",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

const EVENT_CATEGORIES = [
  "Education",
  "Health",
  "Environment",
  "Food Drive",
  "Fundraiser",
  "Animal Welfare",
  "Community Cleanup",
  "Skill Building"
];

module.exports = {
  ROLES,
  EVENT_STATUS,
  EVENT_CATEGORIES
};
