const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socniti";

console.log("Testing MongoDB connection...");
console.log("URI:", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connection successful!");
    console.log("Database:", mongoose.connection.name);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
    console.log("\nPlease ensure MongoDB is running:");
    console.log("  - Windows: Run 'mongod' or check if MongoDB service is running");
    console.log("  - macOS: Run 'brew services start mongodb-community'");
    console.log("  - Linux: Run 'sudo systemctl start mongod'");
    process.exit(1);
  });
