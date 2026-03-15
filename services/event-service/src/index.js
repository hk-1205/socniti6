const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDb = require("./config/db");
const eventRoutes = require("./routes/eventRoutes");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { parse } = require("graphql");

dotenv.config({ path: "../../.env" });
dotenv.config();

const app = express();
const port = Number(process.env.EVENT_SERVICE_PORT || 4002);

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ service: "event-service", status: "ok" });
});

app.use("/api/events", eventRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Unexpected server error" });
});

const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])
  type Query {
    _eventPing: String
  }
`);

const resolvers = {
  Query: {
    _eventPing: () => "pong"
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

connectDb()
  .then(async () => {
    // Start the REST API
    app.listen(port, () => {
      console.log(`Event REST service running on port ${port}`);
    });

    // Start a dummy Subgraph on 4005 for the API Gateway
    const { url } = await startStandaloneServer(server, {
      listen: { port: 4005 }
    });
    console.log(`Event GraphQL Subgraph placeholder running at ${url}`);
  })
  .catch((error) => {
    console.error("Event service failed to start", error);
    process.exit(1);
  });
