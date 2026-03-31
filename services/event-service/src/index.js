const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDb = require("./config/db");
const eventRoutes = require("./routes/eventRoutes");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
// Event Service with GraphQL Federation

// GraphQL schema and resolvers
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { buildContext } = require("./graphql/context");

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = express();
const restPort = 4002;
const graphqlPort = 4005;

console.log("🔄 Starting Event Service...");

// CORS configuration for development
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

// Create Apollo Server
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

connectDb()
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    
    // Start REST API
    app.listen(restPort, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 EVENT SERVICE READY");
      console.log("=".repeat(60));
      console.log(`📍 REST API: http://localhost:${restPort}`);
      console.log(`📍 Health Check: http://localhost:${restPort}/health`);
      console.log(`📡 CORS: Enabled for all origins (dev mode)`);
      console.log("=".repeat(60) + "\n");
    });

    // Start GraphQL Subgraph
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
    console.error("  1. Check if MongoDB is running");
    console.error("  2. Verify MONGODB_URI in .env file");
    console.error(`  3. Check if ports ${restPort} or ${graphqlPort} are in use`);
    console.error("  4. Check database connection settings");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
