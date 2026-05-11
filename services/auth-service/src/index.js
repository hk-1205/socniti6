const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { prisma } = require("@socniti/database");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const typeDefs = require("./schema");
const resolvers = require("./resolvers");

async function startServer() {
    const PORT = process.env.AUTH_SERVICE_PORT || 4001;

    console.log("🔄 Starting Auth Service...");

    try {
        await prisma.$connect();
        console.log("✅ PostgreSQL/Prisma connected successfully");
    } catch (error) {
        console.error("\n" + "=".repeat(60));
        console.error("❌ DATABASE CONNECTION FAILED");
        console.error("=".repeat(60));
        console.error("Error:", error.message);
        console.error("\n💡 Possible solutions:");
        console.error("  1. Check if PostgreSQL/Supabase is running");
        console.error("  2. Verify DATABASE_URL in .env file");
        console.error("  3. Check network/firewall settings");
        console.error("=".repeat(60) + "\n");
        
        // Continue without DB for development if needed, but usually it crashes
        console.log("⚠️  Continuing without DB (limited functionality)");
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

startServer();
