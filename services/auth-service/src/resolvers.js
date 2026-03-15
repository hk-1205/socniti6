const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
    );
};

const resolvers = {
    Query: {
        me: async (_, __, context) => {
            // In a real implementation we would decode the JWT from context.req.headers.authorization
            // For this demo, we'll try to extract the token
            const authHeader = context.req?.headers?.authorization || "";
            const token = authHeader.replace("Bearer ", "");
            if (!token) return null;
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                return await User.findById(decoded.id);
            } catch (err) {
                return null;
            }
        },
        user: async (_, { id }) => await User.findById(id),
        users: async () => await User.find({}),
    },

    Mutation: {
        register: async (_, { fullName, email, password, role }) => {
            // Basic validation
            const normalizedEmail = (email || "").toLowerCase().trim();
            if (!normalizedEmail) {
                throw new Error("Email is required");
            }
            if (!password) {
                throw new Error("Password is required");
            }

            let user = await User.findOne({ email: normalizedEmail });
            if (user && user.verified !== false) {
                throw new Error("User with this email already exists");
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            if (!user) {
                user = await User.create({
                    fullName,
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: role || "user",
                    verified: false,
                });
            } else {
                // Update existing unverified user with latest signup details
                user.fullName = fullName;
                user.password = hashedPassword;
                user.role = role || user.role;
                user.verified = false;
            }

            // Generate a simple 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            await user.save();

            // Send the OTP via email
            try {
                const nodemailer = require("nodemailer");
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || "smtp.example.com",
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.SMTP_FROM || "SOCNITI <noreply@socniti.com>",
                    to: normalizedEmail,
                    subject: "Verify your SOCNITI Account",
                    text: `Your verification code is: ${otp}`,
                    html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
                });
            } catch (err) {
                console.error("Failed to send OTP email:", err);
            }

            return {
                success: true,
                message: "OTP has been sent to your email.",
            };
        },

        login: async (_, { email, password }) => {
            const user = await User.findOne({ email });
            if (!user || user.verified === false) throw new Error("Invalid credentials");

            const isMatch = await bcrypt.compare(password, user.password || "");
            if (!isMatch) throw new Error("Invalid credentials");

            const token = generateToken(user);
            return { token, user };
        },

        sendOtp: async (_, { email }) => {
            let user = await User.findOne({ email });
            if (!user) {
                // Create a placeholder user for OTP login flow.
                user = await User.create({
                    fullName: `User ${email.split("@")[0]}`,
                    email,
                    password: "",
                    role: "user",
                    verified: false,
                });
            }
            if (user.verified !== false) {
                throw new Error("Email already verified. Please log in.");
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            await user.save();

            try {
                const nodemailer = require("nodemailer");
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || "smtp.example.com",
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_PORT == 465,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.SMTP_FROM || "SOCNITI <noreply@socniti.com>",
                    to: email,
                    subject: "Your SOCNITI verification code",
                    text: `Your verification code is: ${otp}`,
                    html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
                });
            } catch (err) {
                console.error("Failed to send OTP email:", err);
            }

            return {
                success: true,
                message: "OTP has been sent to your email.",
            };
        },

        verifyOtp: async (_, { email, otp }) => {
            const user = await User.findOne({ email });
            if (!user) throw new Error("User not found");

            if (user.verified !== false) {
                const token = generateToken(user);
                return { token, user };
            }

            if (user.otp !== otp) throw new Error("Invalid OTP");

            user.otp = undefined;
            user.verified = true;
            await user.save();

            const token = generateToken(user);
            return { token, user };
        },
    },

    User: {
        __resolveReference(user) {
            return User.findById(user.id).exec();
        },
        id(user) {
            return user._id.toString(); // Map Mongoose _id to GraphQL id string
        }
    },
};

module.exports = resolvers;
