const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "../../.env" });
dotenv.config();

const typeDefs = require("./schema");
const resolvers = require("./resolvers");

async function startServer() {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socniti";
    const PORT = 4001;

    console.log("🔄 Starting Auth Service...");
    console.log(`📊 MongoDB URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ MongoDB connected successfully");
        console.log(`📦 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ MONGODB CONNECTION FAILED");
        console.error("=".repeat(60));
        console.error("Error:", error.message);
        console.error("\n💡 Possible solutions:");
        console.error("  1. Check if MongoDB is running");
        console.error("  2. Verify MONGODB_URI in .env file");
        console.error("  3. Check network/firewall settings");
        console.error("  4. For MongoDB Atlas: Check IP whitelist");
        console.error("=".repeat(60) + "\n");
        
        // Continue without MongoDB for development
        console.log("⚠️  Continuing without MongoDB (limited functionality)");
    }

    const server = new ApolloServer({
        schema: buildSubgraphSchema({ typeDefs, resolvers }),
        formatError: (formattedError, error) => {
            console.error("🔴 GraphQL Error:", formattedError.message);
            return {
                message: formattedError.message,
                code: formattedError.extensions?.code || "INTERNAL_SERVER_ERROR",
                path: formattedError.path,
            };
        },
    });

    try {
        const { url } = await startStandaloneServer(server, {
            listen: { port: PORT },
            context: async ({ req }) => {
                return { req };
            },
        });

        console.log("\n" + "=".repeat(60));
        console.log("🚀 AUTH SERVICE READY");
        console.log("=".repeat(60));
        console.log(`📍 GraphQL Endpoint: ${url}`);
        console.log(`📡 CORS: Enabled for all origins (dev mode)`);
        console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (change in production!)'}`);
        console.log("=".repeat(60) + "\n");
    } catch (error) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ FAILED TO START AUTH SERVICE");
        console.error("=".repeat(60));
        console.error("Error:", error.message);
        console.error("\n💡 Possible solutions:");
        console.error(`  1. Check if port ${PORT} is already in use`);
        console.error("  2. Check for syntax errors in schema/resolvers");
        console.error("  3. Restart the service");
        console.error("=".repeat(60) + "\n");
        process.exit(1);
    }
}

<<<<<<< HEAD
startServer();
=======
startServer();
>>>>>>> 90c1106e58da36673f54e996efed9d44111fd0c0
