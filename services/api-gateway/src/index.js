const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { ApolloGateway, IntrospectAndCompose } = require("@apollo/gateway");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

dotenv.config();

const port = process.env.GATEWAY_PORT || 8080;

console.log("🔄 Starting API Gateway...");

const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const eventServiceUrl = process.env.EVENT_SERVICE_URL || "http://localhost:4005";
const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:4006";
const donationServiceUrl = process.env.DONATION_SERVICE_URL || "http://localhost:4008";

async function startGateway() {
  const app = express();
  const httpServer = http.createServer(app);

  // Hardening: Helmet for security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Disabling CSP temporarily for Apollo Studio
  }));

  // Logging
  app.use(morgan("dev"));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(cors());
  app.use(express.json());

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: "auth", url: authServiceUrl },
        { name: "events", url: eventServiceUrl },
        { name: "chat", url: chatServiceUrl },
        { name: "donations", url: donationServiceUrl },
      ],
      pollIntervalInMs: 5000,
    }),
  });

  const server = new ApolloServer({
    gateway,
    subscriptions: false,
    formatError: (formattedError) => {
      console.error("🔴 Gateway Error:", formattedError.message);
      return formattedError;
    },
  });

  // Retry mechanism for gateway start (resilience)
  let retries = 5;
  while (retries > 0) {
    try {
      await server.start();
      break;
    } catch (e) {
      console.error(`Gateway start failed, retries left: ${retries - 1}. Error: ${e.message}`);
      retries -= 1;
      if (retries === 0) {
        console.error("❌ Gateway completely failed to start.");
        process.exit(1);
      }
      // wait 2 seconds before retrying
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        return {
          headers: req.headers,
        };
      },
    })
  );

  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  
  console.log("\n" + "=".repeat(60));
  console.log("🚀 API GATEWAY READY (HARDENED)");
  console.log("=".repeat(60));
  console.log(`📍 GraphQL Endpoint: http://localhost:${port}/graphql`);
  console.log("📡 Helmet & Rate Limiting: Enabled");
  console.log("\n🔗 Connected Subgraphs:");
  console.log(`  • Auth Service: ${authServiceUrl}`);
  console.log(`  • Event Service: ${eventServiceUrl}`);
  console.log(`  • Chat Service: ${chatServiceUrl}`);
  console.log(`  • Donation Service: ${donationServiceUrl}`);
  console.log("=".repeat(60) + "\n");
}

startGateway().catch(err => {
  console.error("Fatal error starting gateway", err);
  process.exit(1);
});
