const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { parse } = require("graphql");
const dotenv = require("dotenv");

dotenv.config({ path: "../../.env" });
dotenv.config();

const port = Number(process.env.CHAT_SERVICE_PORT || 4003);

const typeDefs = parse(`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Query {
    _chatPing: String
  }
`);

const resolvers = {
  Query: {
    _chatPing: () => "pong"
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, {
  listen: { port }
}).then(({ url }) => {
  console.log(`🚀 Chat Subgraph placeholder running at ${url}`);
}).catch(console.error);
