const functions = require("firebase-functions");
const cors = require('cors')({ origin: true });
const admin = require("firebase-admin");
const { Groq } = require('groq-sdk');
const OpenAI = require('openai');
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");


let db;
try {
    if (!admin.apps.length) {
        // Try to use service account file if it exists (local development)
        try {
            const serviceAccount = require('./thulani-gulube-firebase-adminsdk-fbsvc-a81802d739.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://thulani-gulube-default-rtdb.firebaseio.com",
                storageBucket: "thulani-gulube.firebasestorage.app"
            });
            logger.info("Initialized with service account");
        } catch (e) {
            // Fallback to default initialization (production)
            admin.initializeApp({
                storageBucket: "thulani-gulube.firebasestorage.app"
            });
            logger.info("Initialized with default credentials");
        }
    }
    db = getFirestore(admin.app(), "profile");
} catch (error) {
    logger.error("Failed to initialize Firebase:", error);
    throw error;
}

// Initialize Groq client
const getGroqClient = () => {
    // Try environment variable first, then Firebase config
    let apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        try {
            apiKey = functions.config().groq?.key;
        } catch (e) {
            logger.warn("Could not access Firebase config");
        }
    }

    if (!apiKey) {
        throw new Error('GROQ_API_KEY not found in environment variables or Firebase config');
    }

    return new Groq({ apiKey });
};

// OpenRouter client (OpenAI-compatible)
const getOpenRouterClient = () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
    return new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://thulani-gulube.web.app",
            "X-Title": "Thulani Gulube Portfolio PA",
        },
    });
};

const MODEL = "google/gemini-2.0-flash-001"; // OpenRouter model


async function getCollectionData(collectionName) {
    try {
        logger.info(`Fetching collection: ${collectionName}`);
        const colRef = db.collection(collectionName);
        const snapshot = await colRef.get();

        if (snapshot.empty) {
            logger.warn(`No documents found in '${collectionName}' collection`);
            return [];
        }

        const allDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        logger.info(`Found ${allDocs.length} documents in ${collectionName}`);
        return allDocs;
    } catch (error) {
        logger.error(`Error fetching ${collectionName}:`, error);
        throw new Error(`Failed to fetch ${collectionName} data: ${error.message}`);
    }
}

// === Single function to get complete resume ===
async function getCurrentResume() {
    const docs = await getCollectionData("resume");
    const current = docs.find(doc => doc.id === "current_resume");
    logger.info("Fetched current resume:", current?.id);
    return current || null;
}

const availableFunctions = {
    getCurrentResume
};

const tools = [
    {
        type: "function",
        function: {
            name: "getCurrentResume",
            description: "Get Thulani's complete current resume including all sections: about, experience, skills, education, projects, certificates, and contact information.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    }
];

// === Main Groq runner — pre-loads resume, supports tool calls ===
async function sendContactMessage({ name, email, message }) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!name || !email || !message) return { success: false, error: "Missing name, email, or message." };
    if (!emailRegex.test(email)) return { success: false, error: "Invalid email address." };

    try {
        await db.collection("contacts").add({
            name: String(name).slice(0, 200),
            email: String(email).slice(0, 200),
            message: String(message).slice(0, 2000),
            source: "pa_chat",
            createdAt: new Date().toISOString(),
        });
    } catch (e) {
        logger.warn("Could not save PA contact to Firestore:", e.message);
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    if (!gmailUser || !gmailPass) return { success: true, note: "Saved to Firestore; email not configured." };

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    const safe = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    try {
        await transporter.sendMail({
            from: `"Portfolio PA" <${gmailUser}>`,
            to: "thulanegulube@gmail.com",
            replyTo: email,
            subject: `[PA] Message from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nSent via: PA chat\n\n${message}`,
            html: `<p><strong>Name:</strong> ${safe(name)}</p><p><strong>Email:</strong> <a href="mailto:${safe(email)}">${safe(email)}</a></p><p><em>Sent via PA chat</em></p><hr><p>${safe(message).replace(/\n/g,"<br>")}</p>`,
        });
    } catch (e) {
        logger.error("sendContactMessage mail error:", e.message);
        return { success: false, error: e.message };
    }
    return { success: true };
}

async function sendEmailToVisitor({ to, subject, body }) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!to || !subject || !body) return { success: false, error: "Missing to, subject, or body." };
    if (!emailRegex.test(to)) return { success: false, error: "Invalid recipient email address." };

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    if (!gmailUser || !gmailPass) return { success: false, error: "Email not configured." };

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    const safe = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    try {
        await transporter.sendMail({
            from: `"Thulani Gulube" <${gmailUser}>`,
            to,
            subject: String(subject).slice(0, 150),
            text: String(body).slice(0, 2000),
            html: `<p>${safe(body).replace(/\n/g,"<br>")}</p><hr><p style="color:#aaa;font-size:11px">Sent on behalf of Thulani Gulube via portfolio PA</p>`,
        });
    } catch (e) {
        logger.error("sendEmailToVisitor mail error:", e.message);
        return { success: false, error: e.message };
    }
    logger.info("PA sent email to visitor:", to);
    return { success: true };
}

async function sendResumePdf({ to }) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!to) return { success: false, error: "Missing recipient email." };
    if (!emailRegex.test(to)) return { success: false, error: "Invalid email address — please double-check and try again." };

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    if (!gmailUser || !gmailPass) return { success: false, error: "Email not configured." };

    // Download PDF from Firestore (stored as base64)
    let pdfBuffer = null;
    try {
        const resumeDoc = await db.collection("resume").doc("current_resume").get();
        const base64 = resumeDoc.data()?.pdf_base64 || null;
        if (!base64) {
            return { success: false, error: "No resume PDF has been uploaded yet. Please ask Thulani to upload his CV via the admin page." };
        }
        pdfBuffer = Buffer.from(base64, "base64");
        logger.info("Resume PDF loaded from Firestore, size:", pdfBuffer.length);
    } catch (e) {
        logger.error("Could not read PDF from Firestore:", e.message);
        return { success: false, error: "Resume PDF could not be retrieved right now. Please try again later." };
    }

    if (!pdfBuffer) {
        return { success: false, error: "No resume PDF has been uploaded yet. Please ask Thulani to upload his CV via the admin page." };
    }

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });

    const mailOptions = {
        from: `"Thulani Gulube" <${gmailUser}>`,
        to,
        subject: "Thulani Gulube — Resume",
        text: `Hi,\n\nPlease find Thulani Gulube's resume attached.\n\nFeel free to reach out at ${gmailUser} with any questions.\n\nBest regards,\nThulani Gulube's PA`,
        html: `<p>Hi,</p><p>Please find Thulani Gulube's resume attached to this email.</p><p>Feel free to reach out at <a href="mailto:${gmailUser}">${gmailUser}</a> with any questions.</p><p>Best regards,<br>Thulani Gulube's PA</p>`,
        attachments: [{ filename: "Thulani_Gulube_Resume.pdf", content: pdfBuffer, contentType: "application/pdf" }],
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (e) {
        logger.error("sendResumePdf mail error:", e.message);
        return { success: false, error: e.message };
    }
    logger.info("PA sent resume PDF to:", to);
    return { success: true, attached: true };
}

const paTools = [
    {
        type: "function",
        function: {
            name: "sendContactMessage",
            description: "Send a message to Thulani on the visitor's behalf. Use this when the visitor wants to contact Thulani, express interest, ask for a callback, or leave a message. Collect their name, email, and message first if not already provided.",
            parameters: {
                type: "object",
                properties: {
                    name:    { type: "string", description: "The visitor's full name." },
                    email:   { type: "string", description: "The visitor's email address." },
                    message: { type: "string", description: "The message to send to Thulani." }
                },
                required: ["name", "email", "message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sendEmailToVisitor",
            description: "Send an email FROM Thulani to a visitor. Use this when Thulani's PA needs to reply to a visitor, send them information, share a link, or follow up on Thulani's behalf. Always ask for the visitor's email first if you don't have it.",
            parameters: {
                type: "object",
                properties: {
                    to:      { type: "string", description: "Recipient email address." },
                    subject: { type: "string", description: "Email subject line." },
                    body:    { type: "string", description: "Plain text email body. Be professional and sign off as Thulani's PA." }
                },
                required: ["to", "subject", "body"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sendResumePdf",
            description: "Send Thulani's resume PDF as an email attachment to a visitor. Use this when a visitor asks for the resume, CV, or wants it sent to their email. Ask for their email address first if you don't have it.",
            parameters: {
                type: "object",
                properties: {
                    to: { type: "string", description: "The visitor's email address to send the resume to." }
                },
                required: ["to"]
            }
        }
    }
];

async function runPersonalAssistant(userPrompt, conversationHistory = []) {
    const client = getOpenRouterClient();

    // Fetch resume once and inject into system prompt
    let resumeContext = "";
    try {
        const resume = await getCurrentResume();
        if (resume?.data) {
            resumeContext = resume.data.slice(0, 3000);
        }
    } catch (e) {
        logger.warn("Could not load resume for PA context:", e.message);
    }

    const systemPrompt = `You are Thulani Gulube's personal assistant (PA). Answer visitor questions about Thulani concisely and professionally. Base answers strictly on the resume below.

You have three tools:
1. sendContactMessage — forwards a visitor's message TO Thulani. Use when a visitor wants to reach out or leave a message.
2. sendEmailToVisitor — sends an email FROM Thulani TO the visitor. Use this to reply, share info, links, or follow up on Thulani's behalf. Sign off as "Thulani Gulube's PA".
3. sendResumePdf — emails Thulani's resume PDF as an attachment directly to the visitor. Use when a visitor asks for the resume or CV.

Always collect the visitor's email before using any tool.

--- RESUME START ---
${resumeContext || "Resume not available — answer from general knowledge about Thulani Gulube, a software developer based in Johannesburg."}
--- RESUME END ---

Keep replies under 120 words. Do not speculate beyond the resume.`;

    // Sanitise history: only allow user/assistant roles and string content
    const safeHistory = (conversationHistory || []).filter(
        h => (h.role === "user" || h.role === "assistant") && typeof h.content === "string"
    ).slice(-20); // keep last 20 turns to stay within token limits

    const messages = [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: userPrompt }
    ];

    try {
        logger.info("Calling OpenRouter API with prompt:", userPrompt);

        const response = await client.chat.completions.create({
            model: MODEL,
            messages,
            tools: paTools,
            tool_choice: "auto",
            temperature: 0.5,
            max_tokens: 400
        });

        const msg = response.choices[0].message;

        // Handle tool calls
        if (msg.tool_calls?.length) {
            messages.push(msg);
            for (const tc of msg.tool_calls) {
                if (tc.function.name === "sendContactMessage") {
                    let args = {};
                    try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) {}
                    const result = await sendContactMessage(args);
                    messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
                } else if (tc.function.name === "sendEmailToVisitor") {
                    let args = {};
                    try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) {}
                    const result = await sendEmailToVisitor(args);
                    messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
                } else if (tc.function.name === "sendResumePdf") {
                    let args = {};
                    try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) {}
                    const result = await sendResumePdf(args);
                    messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
                }
            }
            const final = await client.chat.completions.create({
                model: MODEL, messages, temperature: 0.5, max_tokens: 200
            });
            return final.choices[0].message.content;
        }

        return msg.content;
    } catch (error) {
        logger.error("OpenRouter API error:", error);
        throw new Error(`Failed to process request with OpenRouter API: ${error.message}`);
    }
}


/*
// === Helper to get full collection (matching your client-side logic) ===
async function getCollectionData(collectionName) {
    try {
        logger.info(`Fetching collection: ${collectionName}`);
        const colRef = db.collection(collectionName);
        const snapshot = await colRef.get();

        if (snapshot.empty) {
            logger.warn(`No documents found in '${collectionName}' collection`);
            return [];
        }

        const allDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        logger.info(`Found ${allDocs.length} documents in ${collectionName}`);
        return allDocs;
    } catch (error) {
        logger.error(`Error fetching ${collectionName}:`, error);
        throw new Error(`Failed to fetch ${collectionName} data: ${error.message}`);
    }
}

// === Tool-callable functions (matching your client-side functions) ===
async function getAbout() {
    const about = await getCollectionData("about");
    logger.info("Fetched about data:", about);
    return about;
}

async function getCertificates() {
    return await getCollectionData("certificates");
}

async function getContactInformation() {
    return await getCollectionData("contact_information");
}

async function getProfessionalExperience() {
    return await getCollectionData("professional_experience");
}

async function getProjects() {
    return await getCollectionData("projects");
}

async function getSkills() {
    return await getCollectionData("skills");
}

async function getEducation() {
    return await getCollectionData("education");
}

async function getTechnicalSkills() {
    return await getCollectionData("technical_skills");
}

const availableFunctions = {
    getAbout,
    getCertificates,
    getContactInformation,
    getProfessionalExperience,
    getProjects,
    getSkills,
    getEducation,
    getTechnicalSkills
};

const tools = [
    {
        type: "function",
        function: {
            name: "getAbout",
            description: "Get the about section from Thulani's profile.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getCertificates",
            description: "Fetch the list of Thulani's certificates.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getContactInformation",
            description: "Retrieve Thulani's contact information.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getProfessionalExperience",
            description: "Fetch Thulani's professional work experience.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getProjects",
            description: "Get details of Thulani's projects.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getSkills",
            description: "Fetch Thulani's soft and general skills.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getEducation",
            description: "Retrieve Thulani's education history.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "getTechnicalSkills",
            description: "Get Thulani's technical skills like tools and languages.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    }
];

// === Main Groq runner (matching your client-side logic) ===
async function runPersonalAssistant(userPrompt) {
    const client = getGroqClient();

    const messages = [
        {
            role: "system",
            content: `You are Thulani Gulube's personal assistant. Your role is to help visitors learn about Thulani by answering questions about his background, experience, skills, and projects. 
            
            Use the provided functions to gather accurate information from his profile database. Be professional, helpful, and informative in your responses. 
            
            When answering questions, provide comprehensive information while being concise. If someone asks about specific aspects of his career or skills, make sure to call the appropriate functions to get the most up-to-date information.`
        },
        { role: "user", content: userPrompt }
    ];

    try {
        logger.info("Calling Groq API with prompt:", userPrompt);

        const response = await client.chat.completions.create({
            model: MODEL,
            messages,
            tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 1000
        });

        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            logger.info(`Processing ${toolCalls.length} tool calls`);

            // Add the assistant's response with tool calls to messages
            messages.push(responseMessage);

            // Execute each tool call
            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                logger.info(`Executing function: ${functionName}`);

                if (!availableFunctions[functionName]) {
                    logger.error(`Unknown function: ${functionName}`);
                    continue;
                }

                try {
                    const fn = availableFunctions[functionName];
                    const args = JSON.parse(toolCall.function.arguments || "{}");
                    const result = await fn(args);

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(result)
                    });

                    logger.info(`Function ${functionName} returned:`, result);
                } catch (error) {
                    logger.error(`Error executing function ${functionName}:`, error);
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify({ error: `Failed to fetch ${functionName} data: ${error.message}` })
                    });
                }
            }

            // Get final response with tool results
            const finalResponse = await client.chat.completions.create({
                model: MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 1000
            });

            return finalResponse.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error) {
        logger.error("Groq API error:", error);
        throw new Error(`Failed to process request with Groq API: ${error.message}`);
    }
}*/

// === Firebase v1 HTTPS function ===
exports.callGroq = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        logger.info("Function called", {
            method: req.method,
            origin: req.headers.origin,
            body: req.body
        });

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        try {
            const { prompt, history } = req.body;
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "Missing or invalid 'prompt' in request body"
                });
            }

            logger.info("Processing request with prompt:", prompt);

            const response = await runPersonalAssistant(prompt, Array.isArray(history) ? history : []);

            logger.info("Sending response:", response);

            res.status(200).json({
                response,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error("Function error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: error.message
            });
        }
    });
});

// === sendContactEmail — notifies Thulani when a visitor submits the contact form ===
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

exports.sendContactEmail = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
        if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

        const { name, email, message } = req.body || {};
        if (!name || !email || !message) {
            return res.status(400).json({ error: "Missing fields: name, email, and message are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        // Save contact to Firestore
        try {
            await db.collection("contacts").add({
                name: String(name).slice(0, 200),
                email: String(email).slice(0, 200),
                message: String(message).slice(0, 2000),
                createdAt: new Date().toISOString(),
            });
        } catch (e) {
            logger.warn("Could not save contact to Firestore:", e.message);
        }

        // Send email
        try {
            let gmailUser, gmailPass;
            try {
                gmailUser = process.env.GMAIL_USER || functions.config().gmail?.user;
                gmailPass = process.env.GMAIL_PASS || functions.config().gmail?.pass;
            } catch (_) {}

            if (!gmailUser || !gmailPass) {
                logger.warn("Gmail credentials not configured — contact saved to Firestore only");
                return res.status(200).json({ success: true });
            }

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: gmailUser, pass: gmailPass },
            });

            const safeName    = escapeHtml(name);
            const safeEmail   = escapeHtml(email);
            const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

            await transporter.sendMail({
                from: `"Portfolio Contact" <${gmailUser}>`,
                to: "thulanegulube@gmail.com",
                replyTo: email,
                subject: `New portfolio message from ${name}`,
                text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
                html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><hr><p>${safeMessage}</p>`,
            });

            logger.info("Contact email sent, from:", email);
            res.status(200).json({ success: true });
        } catch (error) {
            logger.error("Email send error:", error);
            // Still return success since the message was saved to Firestore
            res.status(200).json({ success: true });
        }
    });
});

// === Test function to verify database connection ===
exports.testDatabase = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            logger.info("Testing database connection to 'profile' database");

            // Test each collection
            const collections = ['about', 'certificates', 'contact_information', 'professional_experience', 'projects', 'skills', 'education', 'technical_skills'];
            const results = {};

            for (const collectionName of collections) {
                try {
                    const data = await getCollectionData(collectionName);
                    results[collectionName] = {
                        success: true,
                        count: data.length,
                        sample: data.length > 0 ? data[0] : null
                    };
                } catch (error) {
                    results[collectionName] = {
                        success: false,
                        error: error.message
                    };
                }
            }

            res.status(200).json({
                message: "Database test completed",
                database: "profile",
                results,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error("Database test error:", error);
            res.status(500).json({
                error: "Database test failed",
                message: error.message
            });
        }
    });
});