// plugins/chatbot.js - KIRA X MD (Dynamic Bot Name & Fast Speed)
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '../chatbot_db.json');
let chatDB = { dms: false, groups: false, chats: {} };

try {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf-8');
        if (data) chatDB = JSON.parse(data);
    } else {
        fs.writeFileSync(dbPath, JSON.stringify(chatDB, null, 2));
    }
} catch (err) {
    fs.writeFileSync(dbPath, JSON.stringify(chatDB, null, 2));
}

function saveDB() {
    fs.writeFileSync(dbPath, JSON.stringify(chatDB, null, 2));
}

if (!global.chatHistory) {
    global.chatHistory = {};
}

// ─────────────────────────────────────
// KEYS
// ─────────────────────────────────────
const envGeminiKeys = process.env.GEMINI_API_KEYS || "";
const GEMINI_KEY = envGeminiKeys ? envGeminiKeys.split(',')[0] : "PUT_YOUR_GEMINI_KEY_HERE";

const envGroqKeys = process.env.GROQ_API_KEYS || "";
const GROQ_KEY = envGroqKeys ? envGroqKeys.split(',')[0] : "PUT_YOUR_GROQ_KEY_HERE";

module.exports = {
    name: 'chatbot',
    alias: ['autoai'],
    category: 'ai',
    description: 'Toggle Safe & Fast AI Chatbot',
    usage: '.chatbot on/off/delete',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const input = (args && args.length > 0) ? args.join(' ').toLowerCase() : '';
        const isGroup = jid.endsWith('@g.us');

        const isOwner = msg.key.fromMe || (process.env.OWNER_NUMBER && sender.includes(process.env.OWNER_NUMBER));
        
        if (!isOwner) return await sock.sendMessage(jid, { text: "❌ *Only the Bot Owner can control the Chatbot!*" }, { quoted: msg });

        if (!global.isChatbotHooked) {
            sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;
                const autoMsg = m.messages[0];
                if (!autoMsg.message || autoMsg.key.fromMe) return;

                const autoJid = autoMsg.key.remoteJid;
                const autoIsGroup = autoJid.endsWith('@g.us');
                
                const isEnabledInChat = chatDB.chats[autoJid];
                const isGlobalDMs = !autoIsGroup && chatDB.dms;
                const isGlobalGroups = autoIsGroup && chatDB.groups;

                if (!isEnabledInChat && !isGlobalDMs && !isGlobalGroups) return;

                const textMessage = autoMsg.message.conversation || autoMsg.message.extendedTextMessage?.text || '';
                if (!textMessage) return;

                if (/^[\\.\!\/\#]/.test(textMessage)) return; 

                if (!global.chatHistory[autoJid]) global.chatHistory[autoJid] = [];
                
                let historyText = global.chatHistory[autoJid].map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n");
                let aiReply = null;

                // 🔥 Dynamic Prompt Setup
                const botName = global.config?.BOT_NAME || process.env.BOT_NAME || 'KIRA X MD';
                const ownerName = global.config?.OWNER_NAME || process.env.OWNER_NAME || 'the owner';

                const promptText = `You are an AI assistant named ${botName}, created by ${ownerName}. STRICT LANGUAGE RULE: Reply in the EXACT SAME LANGUAGE as user. If English, reply in English. If Malayalam, reply in pure Malayalam script. Be friendly and casual.\n\nChat History:\n${historyText}\n\nUser: ${textMessage}\nAssistant:`;

                // ⚡ API FETCHING (Background)
                try {
                    const res = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
                        { contents: [{ role: "user", parts: [{ text: promptText }] }] },
                        { headers: { 'Content-Type': 'application/json' }, timeout: 4000 }
                    );
                    if (res.data && res.data.candidates) {
                        aiReply = res.data.candidates[0].content.parts[0].text;
                    }
                } catch (e) {}

                if (!aiReply) {
                    try {
                        const res = await axios.post(
                            'https://api.groq.com/openai/v1/chat/completions',
                            { 
                                model: 'llama-3.3-70b-versatile', 
                                messages: [{ role: 'user', content: promptText }] 
                            },
                            { 
                                headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
                                timeout: 4000 
                            }
                        );
                        if (res.data && res.data.choices) {
                            aiReply = res.data.choices[0].message.content;
                        }
                    } catch (e) {}
                }

                if (aiReply) {
                    global.chatHistory[autoJid].push({ role: 'user', content: textMessage });
                    global.chatHistory[autoJid].push({ role: 'assistant', content: aiReply });

                    if (global.chatHistory[autoJid].length > 6) {
                        global.chatHistory[autoJid] = global.chatHistory[autoJid].slice(global.chatHistory[autoJid].length - 6);
                    }

                    // 🛡️ HUMAN-LIKE SAFE SPEED
                    await sock.presenceSubscribe(autoJid);
                    await sock.sendPresenceUpdate('composing', autoJid);

                    setTimeout(async () => {
                        await sock.sendMessage(autoJid, { text: aiReply }, { quoted: autoMsg });
                        await sock.sendPresenceUpdate('paused', autoJid);
                    }, 800); 
                    
                } else {
                    console.log("❌ AI Failed! Keys might be missing or invalid.");
                }
            });
            global.isChatbotHooked = true;
            console.log("✨ Safe & Fast Chatbot Activated!");
        }

        if (!input) {
            return await sock.sendMessage(jid, { text: `🤖 *SAFE & FAST CHATBOT*\n\n➤ \`.chatbot on/off\`\n➤ \`.chatbot delete\`\n\n*Status here:* ${chatDB.chats[jid] ? "ON ✅" : "OFF ❌"}` }, { quoted: msg });
        }

        if (input === 'delete' || input === 'clear') {
            global.chatHistory[jid] = [];
            return await sock.sendMessage(jid, { text: "🧹 *AI Memory Cleared!*" }, { quoted: msg });
        }

        if (input === 'on dms') { chatDB.dms = true; saveDB(); return sock.sendMessage(jid, { text: "✅ ON for ALL DMs!" }); }
        if (input === 'off dms') { chatDB.dms = false; saveDB(); return sock.sendMessage(jid, { text: "❌ OFF for ALL DMs!" }); }
        if (input === 'on groups') { chatDB.groups = true; saveDB(); return sock.sendMessage(jid, { text: "✅ ON for ALL GROUPS!" }); }
        if (input === 'off groups') { chatDB.groups = false; saveDB(); return sock.sendMessage(jid, { text: "❌ OFF for ALL GROUPS!" }); }
        if (input === 'on') { chatDB.chats[jid] = true; saveDB(); return sock.sendMessage(jid, { text: `✅ ON!` }); }
        if (input === 'off') { chatDB.chats[jid] = false; saveDB(); return sock.sendMessage(jid, { text: `❌ OFF!` }); }
    }
};