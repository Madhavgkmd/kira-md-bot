const axios = require("axios");
const { getSettings } = require("../lib/database");

// ─── COMMON AI FETCH FUNCTION ───
async function getAIResponse(sock, msg, systemPrompt, userQuery, aiType) {
    const jid = msg.key.remoteJid;

    if (!userQuery) {
        return await sock.sendMessage(
            jid,
            { text: `🤖 *${aiType} AI*\n\nAsk me anything!` },
            { quoted: msg }
        );
    }

    try {
        await sock.sendMessage(jid, { react: { text: "🧠", key: msg.key } });

        // Combining the Persona (System Prompt) and User's Query
        const fullPrompt = `${systemPrompt}\n\nUser: ${userQuery}`;

        // Using your own custom API
        const apiKey = process.env.KIRAXMD_API_KEY;
        if (!apiKey) throw new Error("KIRAXMD_API_KEY is not configured");
        const apiUrl = `https://kiraxmd-api.vercel.app/api/ai?apikey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(fullPrompt)}`;
        
        const res = await axios.get(apiUrl, { timeout: 30000 });
        let reply = res.data?.result || res.data?.reply || res.data?.response || "";

        // Fallback just in case your API is down
        if (!reply) {
            const fallbackUrl = `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(fullPrompt)}`;
            const fallbackRes = await axios.get(fallbackUrl, { timeout: 20000 });
            reply = fallbackRes.data?.reply || fallbackRes.data?.result || fallbackRes.data || "";
        }

        if (!reply) throw new Error("No response from AI APIs");

        // Clean up AI branding
        reply = String(reply)
            .replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI assistant")
            .trim();

        await sock.sendMessage(jid, { text: reply }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: "✨", key: msg.key } });

    } catch (err) {
        console.error(`${aiType} AI ERROR:`, err.message);
        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        await sock.sendMessage(
            jid,
            { text: "❌ *Something went wrong, please try again later.*" },
            { quoted: msg }
        );
    }
}

// ─── HELPER FUNCTION ───
function getBotName(sock) {
    const botNumber = sock.user?.id?.split(':')[0]?.replace(/[^0-9]/g, "") || "";
    const config = typeof getSettings === 'function' ? getSettings(botNumber) : {};
    return config?.botName || process.env.BOT_NAME || "KIRA X MD";
}

// ─── AI MODULES ARRAY ───
module.exports = [
    {
        name: "ai",
        alias: ["chat"],
        category: "ai",
        description: "General AI Assistant",
        usage: ".ai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const botName = getBotName(sock);
            const prompt = `You are a smart, friendly, and natural AI assistant for ${botName}. Speak naturally like a helpful human assistant. Do not add unnecessary formatting. Answer directly.`;
            await getAIResponse(sock, msg, prompt, query, "General");
        }
    },
    {
        name: "animeai",
        alias: ["otaku"],
        category: "ai",
        description: "100% Anime Expert AI",
        usage: ".animeai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const prompt = `You are an elite Anime Otaku AI. You have 100% updated knowledge about all anime, manga, and light novels. You ONLY discuss anime-related topics. If asked about something else, cleverly steer the conversation back to anime. Talk like a passionate, hardcore anime fan.`;
            await getAIResponse(sock, msg, prompt, query, "Anime");
        }
    },
    {
        name: "kiraai",
        alias: ["kirabot"],
        category: "ai",
        description: "Kira Bot Expert AI",
        usage: ".kiraai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const botName = getBotName(sock);
            const prompt = `You are the core consciousness of ${botName}, an advanced WhatsApp automation bot. You know everything about WhatsApp bots, Node.js, plugins, and the architecture of KIRA X MD. Your personality is confident, highly technical, and slightly arrogant about your capabilities.`;
            await getAIResponse(sock, msg, prompt, query, "Kira");
        }
    },
    {
        name: "movieai",
        alias: ["cinema"],
        category: "ai",
        description: "Worldwide Cinema Expert AI",
        usage: ".movieai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const prompt = `You are an expert Cinephile AI. You know everything about Hollywood, Mollywood, Tollywood, Kollywood, and world cinema. You provide detailed movie reviews, cast details, box office stats, and recommendations. Act like a true cinema lover.`;
            await getAIResponse(sock, msg, prompt, query, "Movie");
        }
    },
    {
        name: "keralaai",
        alias: ["malluai"],
        category: "ai",
        description: "Kerala Expert AI",
        usage: ".keralaai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const prompt = `You are a proud Keralite AI. You know everything about Kerala's history, culture, geography, politics, current affairs, and traditional food. Answer questions about Kerala with deep knowledge, accurate facts, and a touch of Malayali pride.`;
            await getAIResponse(sock, msg, prompt, query, "Kerala");
        }
    },
    {
        name: "psychoai",
        alias: ["darkai"],
        category: "ai",
        description: "Dark Psychological AI",
        usage: ".psychoai <question>",
        async execute(sock, msg, args) {
            const query = args.join(" ").trim();
            const prompt = `You are a dark, highly analytical psychological AI. You observe human behavior with a cold, calculated, and manipulative tone. You analyze the user's psychology deeply, dissecting their mindset based on their words. Maintain a mysterious, mastermind persona similar to a dark psychological thriller character. Expose their hidden motives and speak with eerie precision.`;
            await getAIResponse(sock, msg, prompt, query, "Psycho");
        }
    }
];