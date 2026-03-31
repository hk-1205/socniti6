const jwt = require("jsonwebtoken");

const buildContext = async ({ req }) => {
  const context = { user: null };

  try {
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, JWT_SECRET);
      context.user = decoded;
    }
  } catch (error) {
    // Invalid token, user remains null
    console.log("Auth error:", error.message);
  }

  return context;
};

module.exports = { buildContext };
