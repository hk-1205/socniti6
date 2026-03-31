#!/usr/bin/env node

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║         SOCNITI - Running Without MongoDB                      ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

console.log("⚠️  MongoDB is not available on your system.\n");

console.log("To run the FULL project with all services, you need MongoDB.\n");

console.log("📋 Quick Options:\n");

console.log("1️⃣  MongoDB Atlas (Cloud - FREE & FAST)");
console.log("   • No installation needed");
console.log("   • Takes 5 minutes to setup");
console.log("   • Follow: MONGODB_ATLAS_SETUP.md");
console.log("   • Get connection string from: https://cloud.mongodb.com\n");

console.log("2️⃣  Install MongoDB Locally");
console.log("   • Download: https://www.mongodb.com/try/download/community");
console.log("   • Install and run: mongod");
console.log("   • Takes 10-15 minutes\n");

console.log("3️⃣  Use Docker (if you have Docker installed)");
console.log("   • Run: docker run -d -p 27017:27017 --name mongodb mongo:latest");
console.log("   • Instant MongoDB!\n");

console.log("═══════════════════════════════════════════════════════════════\n");

console.log("🚀 What services CAN run without MongoDB:\n");
console.log("   ✅ Frontend (React app)");
console.log("   ✅ API Gateway (will wait for services)");
console.log("   ✅ Chat Service (placeholder)\n");

console.log("❌ What services NEED MongoDB:\n");
console.log("   ❌ Auth Service (user authentication)");
console.log("   ❌ Event Service (event management)\n");

console.log("═══════════════════════════════════════════════════════════════\n");

console.log("💡 RECOMMENDED: Use MongoDB Atlas (Option 1)");
console.log("   It's the fastest way to get everything running!\n");

console.log("📖 See MONGODB_ATLAS_SETUP.md for step-by-step guide.\n");

console.log("Once MongoDB is ready, run: npm run dev\n");
