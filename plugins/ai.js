const axios = require("axios");

module.exports = {
    name: "ai",
    alias: ["kira", "bot", "chat"],
    category: "ai",
    description: "AI Assistant",
    usage: `${process.env.PREFIX || "."}ai <question>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const question = args.join(" ").trim();

        if (!question) {
            return await sock.sendMessage(
                jid,
                {
                    text: `🤖 *AI Assistant*\n\nAsk me anything!`
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: { text: "🧠", key: msg.key }
            });

            const thinking = await sock.sendMessage(
                jid,
                {
                    text: `🤖 _Thinking..._`
                },
                { quoted: msg }
            );

            // 🔥 Dynamic Bot Name
            const botName = global.config?.BOT_NAME || process.env.BOT_NAME || "KIRA X MD";

            const prompt = `
You are a smart, friendly and natural AI assistant for ${botName}.

Your identity:
- You are an AI assistant created for ${botName}.
- Do not claim to be ChatGPT, Gemini, Google AI or OpenAI.
- If asked "who are you?", introduce yourself naturally as an AI assistant for ${botName}.
- You do NOT need to mention the bot name in every reply.
- Speak naturally like a helpful human assistant.
- Keep answers appropriate to the user's question.
- Do not add unnecessary headings, question/answer labels, boxes or decorative formatting.
- Do not repeat the user's question.
- Answer directly.

User: ${question}
`;

            const apis = [
                `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(prompt)}`,
                `https://jerrycoder.oggyapi.workers.dev/ai/gpt?q=${encodeURIComponent(prompt)}`
            ];

            let reply = "";

            for (const url of apis) {
                try {
                    const res = await axios.get(url, {
                        timeout: 20000
                    });

                    const data = res.data;

                    if (typeof data === "string") {
                        reply = data;
                    } else {
                        reply =
                            data?.reply ||
                            data?.response ||
                            data?.result ||
                            data?.text ||
                            data?.message ||
                            "";
                    }

                    if (reply) break;

                } catch (e) {
                    console.log("AI API failed, trying next...");
                }
            }

            if (!reply) {
                throw new Error("No response from AI APIs");
            }

            reply = String(reply)
                .replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI assistant")
                .trim();

            // Edit "Thinking..." message
            try {
                await sock.sendMessage(jid, {
                    text: reply
                }, {
                    edit: thinking.key
                });
            } catch {
                await sock.sendMessage(
                    jid,
                    { text: reply },
                    { quoted: msg }
                );
            }

            await sock.sendMessage(jid, {
                react: { text: "✨", key: msg.key }
            });

        } catch (err) {
            console.error("AI ERROR:", err.message);

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });

            await sock.sendMessage(
                jid,
                {
                    text: `🤖 Sorry, I couldn't process that right now.`
                },
                { quoted: msg }
            );
        }
    }
};