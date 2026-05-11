const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const morgan = require("morgan");
const { prisma } = require("@socniti/database");
const eventRoutes = require("./routes/eventRoutes");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { buildContext } = require("./graphql/context");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const restPort = process.env.EVENT_REST_PORT || 4002;
const graphqlPort = process.env.EVENT_GRAPHQL_PORT || 4005;

console.log("🔄 Starting Event Service...");

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ 
    service: "event-service", 
    status: "ok",
    rest: `http://localhost:${restPort}`,
    graphql: `http://localhost:${graphqlPort}`,
  });
});

app.use("/api/events", eventRoutes);

app.use((error, _req, res, _next) => {
  console.error("🔴 REST API Error:", error.message);
  res.status(error.status || 500).json({ 
    error: error.message || "Unexpected server error",
    code: error.code || "INTERNAL_ERROR",
  });
});

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

prisma.$connect()
  .then(async () => {
    console.log("✅ PostgreSQL/Prisma connected successfully");
    
    app.listen(restPort, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 EVENT SERVICE READY");
      console.log("=".repeat(60));
      console.log(`📍 REST API: http://localhost:${restPort}`);
      console.log(`📍 Health Check: http://localhost:${restPort}/health`);
      console.log(`📡 CORS: Enabled for all origins (dev mode)`);
      console.log("=".repeat(60) + "\n");
    });

    const { url } = await startStandaloneServer(server, {
      listen: { port: graphqlPort },
      context: buildContext
    });
    
    console.log("=".repeat(60));
    console.log("🚀 EVENT GRAPHQL SUBGRAPH READY");
    console.log("=".repeat(60));
    console.log(`📍 GraphQL Endpoint: ${url}`);
    console.log(`📡 Federated with Auth Service`);
    console.log("=".repeat(60) + "\n");
  })
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ EVENT SERVICE FAILED TO START");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    console.error("\n💡 Possible solutions:");
    console.error("  1. Check if Supabase/Postgres is running");
    console.error("  2. Verify DATABASE_URL in .env file");
    console.error(`  3. Check if ports ${restPort} or ${graphqlPort} are in use`);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
