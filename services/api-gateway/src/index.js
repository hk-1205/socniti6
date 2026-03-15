const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { ApolloGateway, IntrospectAndCompose } = require("@apollo/gateway");

dotenv.config();

const app = express();
const port = Number(process.env.GATEWAY_PORT || 8080);

const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:4001/graphql";
const eventServiceUrl = process.env.EVENT_SERVICE_URL || "http://localhost:4005/graphql";
const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:4003/graphql";

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "auth", url: authServiceUrl },
      { name: "events", url: eventServiceUrl },
      { name: "chat", url: chatServiceUrl },
    ],
    // The gateway will poll the subgraphs frequently to dynamically update the
    // supergraph if they are offline and come back online later.
    pollIntervalInMs: 5000,
  }),
});

const server = new ApolloServer({
  gateway,
  // Let Apollo Server know it's acting as a gateway
  subscriptions: false,
});

startStandaloneServer(server, {
  listen: { port },
}).then(({ url }) => {
  console.log(`🚀 API Gateway ready at ${url}`);
}).catch((err) => {
  console.error("Failed to start Gateway", err);
});
