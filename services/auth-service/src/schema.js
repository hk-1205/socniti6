const gql = require("graphql-tag");

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type User @key(fields: "id") {
    id: ID!
    fullName: String!
    email: String
    phone: String
    role: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type OtpStatus {
    success: Boolean!
    message: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    register(fullName: String!, email: String!, password: String!, role: String): OtpStatus!
    login(email: String!, password: String!): AuthPayload!
    sendOtp(email: String!): OtpStatus!
    verifyOtp(email: String!, otp: String!): AuthPayload!
  }
`;

module.exports = typeDefs;
