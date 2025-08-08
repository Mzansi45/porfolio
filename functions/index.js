const functions = require("firebase-functions");
const cors = require('cors')({ origin: true });
const admin = require("firebase-admin");
const { Groq } = require('groq-sdk');
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");


let db;
try {
    if (!admin.apps.length) {
        // Try to use service account file if it exists (local development)
        try {
            const serviceAccount = require('./thulani-gulube-firebase-adminsdk-fbsvc-a81802d739.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://thulani-gulube-default-rtdb.firebaseio.com"
            });
            logger.info("Initialized with service account");
        } catch (e) {
            // Fallback to default initialization (production)
            admin.initializeApp();
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

const MODEL = "llama-3.3-70b-versatile";

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
}

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
            const { prompt } = req.body;
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "Missing or invalid 'prompt' in request body"
                });
            }

            logger.info("Processing request with prompt:", prompt);

            const response = await runPersonalAssistant(prompt);

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