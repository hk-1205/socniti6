const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("@socniti/database");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";

// Error messages
const ERRORS = {
    MISSING_FIELDS: "All required fields must be provided",
    INVALID_USERNAME: "Username must be at least 3 characters and contain only letters, numbers, and underscores",
    INVALID_EMAIL: "Please provide a valid email address",
    INVALID_PASSWORD: "Password must be at least 6 characters",
    USERNAME_EXISTS: "Username is already taken",
    EMAIL_EXISTS: "Email is already registered",
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid username or password",
    ACCOUNT_NOT_VERIFIED: "Please verify your account with the OTP sent to your email",
    INVALID_OTP: "Invalid or expired OTP code",
    OTP_EXPIRED: "OTP has expired. Please request a new one",
    EMAIL_SEND_FAILED: "Failed to send OTP email. Please try again",
    DATABASE_ERROR: "Database error occurred. Please try again",
};

const generateToken = (user) => {
    return jwt.sign(
        { 
            sub: user.id,
            id: user.id,
            username: user.username,
            email: user.email, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: "30d" }
    );
};

const validateUsername = (username) => {
    if (!username || username.length < 3) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        throw new Error(ERRORS.INVALID_EMAIL);
    }
};

const validatePassword = (password) => {
    if (!password || password.length < 6) {
        throw new Error(ERRORS.INVALID_PASSWORD);
    }
};

const sendOtpEmail = async (email, otp, fullName) => {
    try {
        const nodemailer = require("nodemailer");
        let transporter;

        // Check if SMTP is properly configured
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.example.com") {
            console.log("\n" + "=".repeat(60));
            console.log("⚠️ SMTP not configured. Creating temporary Ethereal account...");
            
            // Create a test account on the fly
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        } else {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT == 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || "SOCNITI <noreply@socniti.com>",
            to: email,
            subject: "Verify your SOCNITI Account",
            text: `Hello ${fullName},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #4F46E5; padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">SOCNITI</h1>
                    </div>
                    <div style="padding: 32px; background-color: white;">
                        <h2 style="color: #111827; margin-top: 0;">Welcome to SOCNITI!</h2>
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">Hello ${fullName},</p>
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">Please use the following verification code to complete your registration:</p>
                        
                        <div style="background: #EEF2FF; border: 2px dashed #4F46E5; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
                            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4F46E5;">
                                ${otp}
                            </div>
                        </div>
                        
                        <p style="color: #6B7280; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
                        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;" />
                        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                </div>
            `,
        });
        
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.example.com") {
            console.log("\n" + "=".repeat(60));
            console.log("📧 OTP EMAIL SENT (Ethereal Dev Mode)");
            console.log("=".repeat(60));
            console.log(`To: ${email}`);
            console.log(`OTP Code: ${otp}`);
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            console.log("=".repeat(60) + "\n");
        }
        
        return true;
    } catch (err) {
        console.error("❌ Failed to send OTP email:", err.message);
        return false;
    }
};

const resolvers = {
    Query: {
        me: async (_, __, context) => {
            try {
                const authHeader = context.req?.headers?.authorization || "";
                const token = authHeader.replace("Bearer ", "");
                
                if (!token) {
                    throw new Error("Authentication required. Please log in.");
                }
                
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await prisma.user.findUnique({ where: { id: decoded.id || decoded.sub } });
                
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }
                
                return user;
            } catch (err) {
                if (err.name === "JsonWebTokenError") {
                    throw new Error("Invalid authentication token. Please log in again.");
                }
                if (err.name === "TokenExpiredError") {
                    throw new Error("Your session has expired. Please log in again.");
                }
                throw err;
            }
        },
        
        user: async (_, { id }) => {
            try {
                const user = await prisma.user.findUnique({ where: { id } });
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }
                return user;
            } catch (err) {
                throw new Error(`Failed to fetch user: ${err.message}`);
            }
        },
        
        users: async () => {
            try {
                return await prisma.user.findMany();
            } catch (err) {
                throw new Error(`Failed to fetch users: ${err.message}`);
            }
        },
        
        pendingOrganizers: async (_, __, context) => {
            try {
                const authHeader = context.req?.headers?.authorization || "";
                const token = authHeader.replace("Bearer ", "");
                if (!token) throw new Error("Authentication required.");
                
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await prisma.user.findUnique({ where: { id: decoded.id || decoded.sub } });
                
                if (!user || user.role !== "admin") {
                    throw new Error("Admin access required.");
                }
                
                return await prisma.user.findMany({
                    where: { role: "organizer", isOrganizerApproved: false, isVerified: true }
                });
            } catch (err) {
                throw new Error(`Failed to fetch pending organizers: ${err.message}`);
            }
        },
    },

    Mutation: {
        verifyOrganizer: async (_, { userId, status }, context) => {
            try {
                const authHeader = context.req?.headers?.authorization || "";
                const token = authHeader.replace("Bearer ", "");
                if (!token) throw new Error("Authentication required.");
                
                const decoded = jwt.verify(token, JWT_SECRET);
                const admin = await prisma.user.findUnique({ where: { id: decoded.id || decoded.sub } });
                
                if (!admin || admin.role !== "admin") {
                    throw new Error("Admin access required.");
                }

                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user || user.role !== "organizer") {
                    throw new Error("User not found or not an organizer");
                }

                const updatedUser = await prisma.user.update({
                    where: { id: userId },
                    data: { isOrganizerApproved: status }
                });

                return updatedUser;
            } catch (err) {
                throw new Error(`Verification failed: ${err.message}`);
            }
        },

        signup: async (_, { fullName, username, email, password, role }) => {
            try {
                if (!fullName || !username || !email || !password) {
                    throw new Error(ERRORS.MISSING_FIELDS);
                }
                
                validateUsername(username);
                validateEmail(email);
                validatePassword(password);

                const normalizedEmail = email.toLowerCase().trim();
                const normalizedUsername = username.toLowerCase().trim();

                const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
                if (existingUsername && existingUsername.isVerified) {
                    throw new Error(ERRORS.USERNAME_EXISTS);
                }

                const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (existingEmail && existingEmail.isVerified) {
                    throw new Error(ERRORS.EMAIL_EXISTS);
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

                let user;
                if (existingUsername || existingEmail) {
                    const idToUpdate = existingUsername ? existingUsername.id : existingEmail.id;
                    user = await prisma.user.update({
                        where: { id: idToUpdate },
                        data: {
                            fullName,
                            username: normalizedUsername,
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: role || "user",
                            otp,
                            otpExpires,
                            isVerified: false,
                        }
                    });
                } else {
                    user = await prisma.user.create({
                        data: {
                            fullName,
                            username: normalizedUsername,
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: role || "user",
                            otp,
                            otpExpires,
                            isVerified: false,
                        }
                    });
                }

                const emailSent = await sendOtpEmail(normalizedEmail, otp, fullName);

                return {
                    success: true,
                    message: emailSent 
                        ? `OTP sent to ${normalizedEmail}. Please check your email (or console if SMTP not configured).`
                        : `Account created! OTP: ${otp} (Email sending failed, showing OTP here)`,
                };
            } catch (err) {
                console.error("❌ Signup error:", err.message);
                throw new Error(`Signup failed: ${err.message}`);
            }
        },

        verifySignupOtp: async (_, { email, otp }) => {
            try {
                if (!email || !otp) {
                    throw new Error("Email and OTP are required");
                }

                const normalizedEmail = email.toLowerCase().trim();
                let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }

                if (user.isVerified) {
                    const token = generateToken(user);
                    return { token, user };
                }

                if (!user.otp || !user.otpExpires) {
                    throw new Error("No OTP found. Please request a new one.");
                }

                if (new Date() > user.otpExpires) {
                    throw new Error(ERRORS.OTP_EXPIRED);
                }

                if (user.otp !== otp) {
                    throw new Error(ERRORS.INVALID_OTP);
                }

                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        otp: null,
                        otpExpires: null,
                        isVerified: true,
                    }
                });

                const token = generateToken(user);
                console.log(`✅ User verified: ${user.username} (${user.email})`);
                
                return { token, user };
            } catch (err) {
                console.error("❌ OTP verification error:", err.message);
                throw new Error(`Verification failed: ${err.message}`);
            }
        },

        login: async (_, { username, password }) => {
            try {
                if (!username || !password) {
                    throw new Error("Username and password are required");
                }

                const normalizedUsername = username.toLowerCase().trim();
                const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
                
                if (!user) {
                    throw new Error(ERRORS.INVALID_CREDENTIALS);
                }

                if (!user.isVerified) {
                    throw new Error(ERRORS.ACCOUNT_NOT_VERIFIED);
                }

                const isMatch = await bcrypt.compare(password, user.password || "");
                if (!isMatch) {
                    throw new Error(ERRORS.INVALID_CREDENTIALS);
                }

                const token = generateToken(user);
                console.log(`✅ User logged in: ${user.username}`);
                
                return { token, user };
            } catch (err) {
                console.error("❌ Login error:", err.message);
                throw new Error(`Login failed: ${err.message}`);
            }
        },

        register: async (_, { fullName, email, password, role }) => {
            try {
                const normalizedEmail = (email || "").toLowerCase().trim();
                
                if (!normalizedEmail) {
                    throw new Error(ERRORS.INVALID_EMAIL);
                }
                if (!password) {
                    throw new Error(ERRORS.INVALID_PASSWORD);
                }

                let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (user && user.isVerified) {
                    throw new Error(ERRORS.EMAIL_EXISTS);
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            fullName,
                            username: normalizedEmail.split("@")[0],
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: role || "user",
                            isVerified: false,
                            otp,
                            otpExpires
                        }
                    });
                } else {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            fullName,
                            password: hashedPassword,
                            role: role || user.role,
                            isVerified: false,
                            otp,
                            otpExpires
                        }
                    });
                }

                await sendOtpEmail(normalizedEmail, otp, fullName);

                return {
                    success: true,
                    message: "OTP has been sent to your email.",
                };
            } catch (err) {
                console.error("❌ Register error:", err.message);
                throw new Error(`Registration failed: ${err.message}`);
            }
        },

        sendOtp: async (_, { email }) => {
            try {
                const normalizedEmail = email.toLowerCase().trim();
                let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            fullName: `User ${normalizedEmail.split("@")[0]}`,
                            username: normalizedEmail.split("@")[0],
                            email: normalizedEmail,
                            role: "user",
                            isVerified: false,
                            otp,
                            otpExpires
                        }
                    });
                } else {
                    if (user.isVerified) {
                        throw new Error("Email already verified. Please log in.");
                    }
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { otp, otpExpires }
                    });
                }
                
                await sendOtpEmail(normalizedEmail, otp, user.fullName);

                return {
                    success: true,
                    message: "OTP has been sent to your email.",
                };
            } catch (err) {
                console.error("❌ Send OTP error:", err.message);
                throw new Error(`Failed to send OTP: ${err.message}`);
            }
        },

        verifyOtp: async (_, { email, otp }) => {
            try {
                const normalizedEmail = email.toLowerCase().trim();
                let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (!user) {
                    throw new Error(ERRORS.USER_NOT_FOUND);
                }

                if (user.isVerified) {
                    const token = generateToken(user);
                    return { token, user };
                }

                if (user.otp !== otp) {
                    throw new Error(ERRORS.INVALID_OTP);
                }

                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        otp: null,
                        otpExpires: null,
                        isVerified: true
                    }
                });

                const token = generateToken(user);
                return { token, user };
            } catch (err) {
                console.error("❌ Verify OTP error:", err.message);
                throw new Error(`Verification failed: ${err.message}`);
            }
        },
    },

    User: {
        __resolveReference(user) {
            return prisma.user.findUnique({ where: { id: user.id } });
        },
    },
};

module.exports = resolvers;
