const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load variables relative to project root (or inside service)
dotenv.config({ path: "../../.env" });
dotenv.config();

const typeDefs = require("./schema");
const resolvers = require("./resolvers");

async function startServer() {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socniti";
    const PORT = Number(process.env.AUTH_SERVICE_PORT || 4001);

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Authenticated with MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
    }

    const server = new ApolloServer({
        schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });

    const { url } = await startStandaloneServer(server, {
        listen: { port: PORT },
        context: async ({ req }) => {
            // In a real app we would parse the Authorization token here.
            // But for login/register/otp we don't strictly require it.
            // E.g., const auth = req.headers.authorization || '';
            return { req };
        },
    });

    console.log(`🚀 Auth Subgraph running at ${url}`);
}

startServer();
