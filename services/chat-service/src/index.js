const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { parse } = require("graphql");

dotenv.config({ path: "../../.env" });
dotenv.config();

const Message = require("./models/Message");

const app = express();
const httpServer = createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socniti";
const PORT = 4003;
const GRAPHQL_PORT = 4006;

console.log("🔄 Starting Chat Service...");

// CORS
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store active connections
const activeUsers = new Map();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.sub || decoded.id;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
  
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    userId: socket.userId,
  });

  // Join event room
  socket.on("join-event", async (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`📍 ${socket.username} joined event ${eventId}`);
    
    // Notify others
    socket.to(`event-${eventId}`).emit("user-joined", {
      userId: socket.userId,
      username: socket.username,
    });

    // Send recent messages
    try {
      const messages = await Message.find({ eventId })
        .sort({ createdAt: -1 })
        .limit(50);
      
      socket.emit("message-history", messages.reverse());
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  });

  // Leave event room
  socket.on("leave-event", (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`📍 ${socket.username} left event ${eventId}`);
    
    socket.to(`event-${eventId}`).emit("user-left", {
      userId: socket.userId,
      username: socket.username,
    });
  });

  // Send message
  socket.on("send-message", async (data) => {
    const { eventId, content } = data;
    
    if (!content || !content.trim()) {
      return socket.emit("error", { message: "Message cannot be empty" });
    }

    try {
      const message = await Message.create({
        eventId,
        senderId: socket.userId,
        senderName: socket.username,
        content: content.trim(),
        type: "text",
      });

      // Broadcast to event room
      io.to(`event-${eventId}`).emit("new-message", {
        id: message._id.toString(),
        eventId: message.eventId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      });

      console.log(`💬 Message from ${socket.username} in event ${eventId}`);
    } catch (err) {
      console.error("Error saving message:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    socket.to(`event-${data.eventId}`).emit("user-typing", {
      userId: socket.userId,
      username: socket.username,
    });
  });

  socket.on("stop-typing", (data) => {
    socket.to(`event-${data.eventId}`).emit("user-stop-typing", {
      userId: socket.userId,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.username}`);
    activeUsers.delete(socket.userId);
  });
});

// REST endpoints
app.get("/health", (req, res) => {
  res.json({
    service: "chat-service",
    status: "ok",
    websocket: `ws://localhost:${PORT}`,
    graphql: `http://localhost:${GRAPHQL_PORT}`,
    activeUsers: activeUsers.size,
  });
});

app.get("/api/chat/events/:eventId/messages", async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({ eventId })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GraphQL Schema
const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Message @key(fields: "id") {
    id: ID!
    eventId: ID!
    senderId: ID!
    sender: User
    senderName: String!
    content: String!
    type: MessageType!
    createdAt: String!
  }

  enum MessageType {
    text
    system
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    eventMessages(eventId: ID!, limit: Int): [Message!]!
    _chatPing: String
  }
`);

const resolvers = {
  Query: {
    eventMessages: async (_, { eventId, limit = 50 }) => {
      const messages = await Message.find({ eventId })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return messages.reverse().map(msg => ({
        id: msg._id.toString(),
        eventId: msg.eventId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt.toISOString(),
      }));
    },
    _chatPing: () => "pong",
  },
  Message: {
    sender: (message) => {
      return { __typename: "User", id: message.senderId };
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
mongoose
  .connect(MONGODB_URI, { 
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");

    // Start WebSocket server
    httpServer.listen(PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 CHAT SERVICE READY");
      console.log("=".repeat(60));
      console.log(`📍 WebSocket Server: ws://localhost:${PORT}`);
      console.log(`📍 REST API: http://localhost:${PORT}`);
      console.log(`📍 Health Check: http://localhost:${PORT}/health`);
      console.log(`📡 CORS: Enabled for all origins (dev mode)`);
      console.log("=".repeat(60) + "\n");
    });

    // Start GraphQL subgraph
    const { url } = await startStandaloneServer(server, {
      listen: { port: GRAPHQL_PORT },
    });

    console.log("=".repeat(60));
    console.log("🚀 CHAT GRAPHQL SUBGRAPH READY");
    console.log("=".repeat(60));
    console.log(`📍 GraphQL Endpoint: ${url}`);
    console.log(`📡 Federated with Auth Service`);
    console.log("=".repeat(60) + "\n");
  })
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ CHAT SERVICE FAILED TO START");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    console.error("\n💡 Possible solutions:");
    console.error("  1. Check if MongoDB is running");
    console.error(`  2. Check if ports ${PORT} or ${GRAPHQL_PORT} are in use`);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  });
