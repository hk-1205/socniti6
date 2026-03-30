#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Checking SOCNITI Prerequisites...\n");

let allGood = true;

// Check Node.js version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
  if (majorVersion >= 18) {
    console.log(`✅ Node.js ${nodeVersion} (OK)`);
  } else {
    console.log(`❌ Node.js ${nodeVersion} (Need v18 or higher)`);
    allGood = false;
  }
} catch (error) {
  console.log("❌ Node.js not found");
  allGood = false;
}

// Check npm
try {
  const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
  console.log(`✅ npm ${npmVersion} (OK)`);
} catch (error) {
  console.log("❌ npm not found");
  allGood = false;
}

// Check if node_modules exists
if (fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.log("✅ Dependencies installed (OK)");
} else {
  console.log("❌ Dependencies not installed - Run: npm install");
  allGood = false;
}

// Check .env file
if (fs.existsSync(path.join(__dirname, ".env"))) {
  console.log("✅ .env file exists (OK)");
  
  // Check for MongoDB URI
  const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf-8");
  if (envContent.includes("MONGODB_URI=")) {
    console.log("✅ MongoDB URI configured (OK)");
  } else {
    console.log("⚠️  MongoDB URI not found in .env");
  }
} else {
  console.log("❌ .env file not found - Copy .env.example to .env");
  allGood = false;
}

// Check MongoDB connection
console.log("\n🔌 Testing MongoDB connection...");
const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socniti";

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
    mongoose.connection.close();
    
    console.log("\n" + "=".repeat(50));
    if (allGood) {
      console.log("🎉 All prerequisites met! Ready to run:");
      console.log("   npm run dev");
    } else {
      console.log("⚠️  Some prerequisites are missing. Please fix them first.");
    }
    console.log("=".repeat(50));
    process.exit(0);
  })
  .catch((error) => {
    console.log("❌ MongoDB connection failed");
    console.log(`   Error: ${error.message}`);
    console.log("\n📝 To fix MongoDB connection:");
    console.log("   Windows: Run 'mongod' or start MongoDB service");
    console.log("   macOS:   Run 'brew services start mongodb-community'");
    console.log("   Linux:   Run 'sudo systemctl start mongod'");
    
    console.log("\n" + "=".repeat(50));
    console.log("⚠️  Prerequisites check failed. Fix issues above.");
    console.log("=".repeat(50));
    process.exit(1);
  });
