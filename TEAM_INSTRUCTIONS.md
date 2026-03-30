# Team 4 - GraphQL Microservices Setup Guide

Welcome to the `socniti` project! We are building a federated GraphQL microservices architecture using Apollo Server. 

The project has been initialized with an **API Gateway** that will route all traffic to our individual subservices. 

* **Person 1** has completed the API Gateway setup and root configurations. 

This guide outlines exactly what **Person 2 (Auth Service)**, **Person 3 (Event Service)**, and **Person 4 (Chat Service)** need to do to get their respective GraphQL subgraphs running.

---

## General Instructions (For Persons 2, 3, and 4)

Your goal is to stand up your distinct service as an Apollo Subgraph so that the gateway can query it.

1. **Install Dependencies:**
   In your service folder (e.g., `services/auth-service`), run:
   ```bash
   npm install @apollo/server @apollo/subgraph graphql cors
   ```

2. **Update your `src/index.js`:**
   Replace the default Express server with a standalone Apollo Subgraph Server.

3. **Schema & Resolvers:**
   You must define `typeDefs` and `resolvers`. Your schema **must** include the `@key` directive on your primary entities so they can be extended by other subgraphs if needed.

4. **Start the Service:**
   Once you've written your server code, you can start the entire cluster from the root directory using:
   ```bash
   npm run dev
   ```
   *(Note: The Gateway might throw polling errors if some subgraphs are down, but it will automatically connect once your server boots up).*

---

## 🔐 Person 2: Auth Service

**Folder:** `services/auth-service`
**Port:** `4001`

**Steps:**
1. Install dependencies as listed above.
2. Open `services/auth-service/src/index.js`.
3. Set up the Apollo Server Subgraph using `@apollo/subgraph` (`buildSubgraphSchema`).
4. Create a basic schema. Here is a starter schema example:

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type User @key(fields: "id") {
    id: ID!
    username: String!
    email: String!
  }

  type Query {
    me: User
    user(id: ID!): User
  }
`;

const resolvers = {
  Query: {
    me() {
      return { id: "1", username: "testuser", email: "test@example.com" };
    },
    user(_, { id }) {
      return { id, username: "user" + id, email: "user" + id + "@example.com" };
    }
  },
  User: {
    __resolveReference(user) {
      return { id: user.id, username: "user" + user.id, email: "user" + user.id + "@example.com" };
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, { listen: { port: 4001 } })
  .then(({ url }) => console.log(`Auth Subgraph running at ${url}`));
```

---

## 📅 Person 3: Event Service

**Folder:** `services/event-service`
**Port:** `4002`

**Steps:**
1. Check if `src/index.js` exists in your folder. If not, create it!
2. Run the dependency installation command in your folder.
3. Your service needs to be able to reference the `User` from the Auth Service.
4. Here is a starter schema example:

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Event @key(fields: "id") {
    id: ID!
    title: String!
    date: String!
    organizerId: ID!
    # By returning this placeholder User, the gateway knows to resolve the rest of the fields from the Auth Service!
    organizer: User
  }

  # We just declare a stub of User so we can reference it
  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    events: [Event]
    event(id: ID!): Event
  }
`;

const events = [
  { id: "101", title: "GraphQL Meetup", date: "2024-10-01", organizerId: "1" }
];

const resolvers = {
  Query: {
    events: () => events,
    event: (_, { id }) => events.find(e => e.id === id)
  },
  Event: {
    organizer(event) {
      return { __typename: "User", id: event.organizerId };
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, { listen: { port: 4002 } })
  .then(({ url }) => console.log(`Event Subgraph running at ${url}`));
```

---

## 💬 Person 4: Chat Service

**Folder:** `services/chat-service`
**Port:** `4003`

**Steps:**
1. Check if `src/index.js` exists in your folder. If not, create it!
2. Run the dependency installation command in your folder.
3. Similar to Event Service, you will likely need to reference users (who sent the message) and potentially the event (where the chat is taking place).
4. Here is a starter schema example:

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Message @key(fields: "id") {
    id: ID!
    content: String!
    senderId: ID!
    sender: User
  }

  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    messages: [Message]
  }
`;

const messages = [
  { id: "M1", content: "Hello everyone!", senderId: "1" }
];

const resolvers = {
  Query: {
    messages: () => messages
  },
  Message: {
    sender(message) {
      return { __typename: "User", id: message.senderId };
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});

startStandaloneServer(server, { listen: { port: 4003 } })
  .then(({ url }) => console.log(`Chat Subgraph running at ${url}`));
```

---

## How to Test the Entire System

Once all 3 subgraphs and the Gateway are running successfully (by running `npm run dev` at the root), you can open Apollo Sandbox by navigating to `http://localhost:8080/graphql`.

You should be able to run an aggregated query like this:

```graphql
query GetEventAndChats {
  events {
    id
    title
    organizer {
      username
      email
    }
  }
  messages {
    id
    content
    sender {
      username
    }
  }
}
```

Happy coding! Let the microservices flow.
