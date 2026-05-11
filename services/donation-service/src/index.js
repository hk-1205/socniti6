const express = require("express");
const cors = require("cors");
const { prisma } = require("@socniti/database");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { parse } = require("graphql");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";
const REST_PORT = process.env.DONATION_REST_PORT || 4007;
const GRAPHQL_PORT = process.env.DONATION_GRAPHQL_PORT || 4008;

console.log("🔄 Starting Donation Service...");

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Auth middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// REST endpoints
app.get("/health", (req, res) => {
  res.json({
    service: "donation-service",
    status: "ok",
    rest: `http://localhost:${REST_PORT}`,
    graphql: `http://localhost:${GRAPHQL_PORT}`,
  });
});

app.get("/api/donations/event/:eventId", async (req, res) => {
  try {
    const donations = await prisma.donation.findMany({ 
        where: { eventId: req.params.eventId },
        orderBy: { createdAt: 'desc' }
    });
    
    const stats = {
      totalMonetary: donations
        .filter(d => d.type === "monetary" && d.status === "completed")
        .reduce((sum, d) => sum + d.amount, 0),
      totalItems: donations
        .filter(d => d.type === "item" && d.status === "completed")
        .length,
      totalDonations: donations.filter(d => d.status === "completed").length,
    };

    res.json({ donations, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/donations", requireAuth, async (req, res) => {
  try {
    const { eventId, amount, item, quantity, type, message } = req.body;

    if (!eventId || !type) {
      return res.status(400).json({ error: "Event ID and type are required" });
    }

    if (type === "monetary" && (!amount || amount <= 0)) {
      return res.status(400).json({ error: "Valid amount is required for monetary donations" });
    }

    if (type === "item" && (!item || !quantity)) {
      return res.status(400).json({ error: "Item and quantity are required for item donations" });
    }

    const donation = await prisma.donation.create({
        data: {
          eventId,
          donorId: req.user.sub || req.user.id,
          donorName: req.user.username || req.user.fullName || "Anonymous",
          amount: type === "monetary" ? amount : 0,
          item: type === "item" ? item : null,
          quantity: type === "item" ? quantity : null,
          type,
          status: "completed",
          message,
        }
    });

    // Also update fulfilled count in Event DonationNeeds if applicable
    if (type === "item") {
        const event = await prisma.event.findUnique({ where: { id: eventId }, include: { donationNeeds: true } });
        if (event) {
            const need = event.donationNeeds.find(n => n.item.toLowerCase() === item.toLowerCase());
            if (need) {
                await prisma.donationNeed.update({
                    where: { id: need.id },
                    data: { fulfilled: { increment: quantity } }
                });
            }
        }
    }

    res.status(201).json({ donation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GraphQL Schema
const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Donation @key(fields: "id") {
    id: ID!
    eventId: ID!
    donorId: ID!
    donor: User
    donorName: String!
    amount: Float
    item: String
    quantity: Int
    type: DonationType!
    status: DonationStatus!
    message: String
    createdAt: String!
  }

  enum DonationType {
    monetary
    item
  }

  enum DonationStatus {
    pending
    completed
    cancelled
  }

  type DonationStats {
    totalMonetary: Float!
    totalItems: Int!
    totalDonations: Int!
  }

  type DonationResponse {
    donations: [Donation!]!
    stats: DonationStats!
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  input CreateDonationInput {
    eventId: ID!
    amount: Float
    item: String
    quantity: Int
    type: DonationType!
    message: String
  }

  type Query {
    eventDonations(eventId: ID!): DonationResponse!
    myDonations: [Donation!]!
    _donationPing: String
  }

  type Mutation {
    createDonation(input: CreateDonationInput!): Donation!
  }
`);

const resolvers = {
  Query: {
    eventDonations: async (_, { eventId }) => {
      const donations = await prisma.donation.findMany({ 
          where: { eventId },
          orderBy: { createdAt: 'desc' }
      });
      
      const stats = {
        totalMonetary: donations
          .filter(d => d.type === "monetary" && d.status === "completed")
          .reduce((sum, d) => sum + d.amount, 0),
        totalItems: donations
          .filter(d => d.type === "item" && d.status === "completed")
          .length,
        totalDonations: donations.filter(d => d.status === "completed").length,
      };

      return {
        donations: donations.map(d => ({
          id: d.id,
          eventId: d.eventId,
          donorId: d.donorId,
          donorName: d.donorName,
          amount: d.amount,
          item: d.item,
          quantity: d.quantity,
          type: d.type,
          status: d.status,
          message: d.message,
          createdAt: d.createdAt.toISOString(),
        })),
        stats,
      };
    },
    myDonations: async (_, __, context) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const donations = await prisma.donation.findMany({ 
          where: { donorId: context.user.sub || context.user.id },
          orderBy: { createdAt: 'desc' }
      });

      return donations.map(d => ({
        id: d.id,
        eventId: d.eventId,
        donorId: d.donorId,
        donorName: d.donorName,
        amount: d.amount,
        item: d.item,
        quantity: d.quantity,
        type: d.type,
        status: d.status,
        message: d.message,
        createdAt: d.createdAt.toISOString(),
      }));
    },
    _donationPing: () => "pong",
  },
  Mutation: {
    createDonation: async (_, { input }, context) => {
      if (!context.user) {
        throw new Error("Authentication required. Please log in to make a donation.");
      }

      const { eventId, amount, item, quantity, type, message } = input;

      if (type === "monetary" && (!amount || amount <= 0)) {
        throw new Error("Valid amount is required for monetary donations");
      }

      if (type === "item" && (!item || !quantity)) {
        throw new Error("Item and quantity are required for item donations");
      }

      const donation = await prisma.donation.create({
        data: {
            eventId,
            donorId: context.user.sub || context.user.id,
            donorName: context.user.username || context.user.fullName || "Anonymous",
            amount: type === "monetary" ? amount : 0,
            item: type === "item" ? item : null,
            quantity: type === "item" ? quantity : null,
            type,
            status: "completed",
            message,
        }
      });

      if (type === "item") {
          const event = await prisma.event.findUnique({ where: { id: eventId }, include: { donationNeeds: true } });
          if (event) {
              const need = event.donationNeeds.find(n => n.item.toLowerCase() === item.toLowerCase());
              if (need) {
                  await prisma.donationNeed.update({
                      where: { id: need.id },
                      data: { fulfilled: { increment: quantity } }
                  });
              }
          }
      }

      return {
        id: donation.id,
        eventId: donation.eventId,
        donorId: donation.donorId,
        donorName: donation.donorName,
        amount: donation.amount,
        item: donation.item,
        quantity: donation.quantity,
        type: donation.type,
        status: donation.status,
        message: donation.message,
        createdAt: donation.createdAt.toISOString(),
      };
    },
  },
  Donation: {
    donor: (donation) => {
      return { __typename: "User", id: donation.donorId };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  formatError: (formattedError) => {
    console.error("🔴 GraphQL Error:", formattedError.message);
    return formattedError;
  },
});

// Start services
prisma.$connect()
  .then(async () => {
    console.log("✅ PostgreSQL/Prisma connected successfully");

    // Start REST API
    app.listen(REST_PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 DONATION SERVICE READY");
      console.log("=".repeat(60));
      console.log(`📍 REST API: http://localhost:${REST_PORT}`);
      console.log(`📍 Health Check: http://localhost:${REST_PORT}/health`);
      console.log(`📡 CORS: Enabled for all origins (dev mode)`);
      console.log("=".repeat(60) + "\n");
    });

    // Start GraphQL subgraph
    const { url } = await startStandaloneServer(server, {
      listen: { port: GRAPHQL_PORT },
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.replace("Bearer ", "");
        
        if (!token) return { user: null };

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          return { user: decoded };
        } catch (err) {
          return { user: null };
        }
      },
    });

    console.log("=".repeat(60));
    console.log("🚀 DONATION GRAPHQL SUBGRAPH READY");
    console.log("=".repeat(60));
    console.log(`📍 GraphQL Endpoint: ${url}`);
    console.log(`📡 Federated with Auth Service`);
    console.log("=".repeat(60) + "\n");
  })
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ DONATION SERVICE FAILED TO START");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    console.error("\n💡 Possible solutions:");
    console.error("  1. Check if PostgreSQL/Supabase is running");
    console.error(`  2. Check if ports ${REST_PORT} or ${GRAPHQL_PORT} are in use`);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
