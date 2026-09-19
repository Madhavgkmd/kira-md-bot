// plugins/chatbot.js - KIRA X MD
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('../lib/database');
require('dotenv').config();

const dbPath = path.join(__dirname, '../chatbot_db.json');
let chatDB = { dms: false, groups: false, chats: {}, prompts: {} };

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

        if (!sock.isChatbotHooked) {
            sock.ev.on('messages.upsert', async (m) => {
                try {
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

                    const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
                    const config = getSettings(botNumber);
                    const botName = config?.botName || process.env.BOT_NAME || 'KIRA X MD';
                    const ownerName = config?.ownerName || process.env.OWNER_NAME || 'the owner';

                    // 🔥 വാട്സാപ്പ് വഴി സെറ്റ് ചെയ്ത കസ്റ്റം പ്രോംപ്റ്റ് ഉണ്ടോ എന്ന് നോക്കുന്നു
                    if (!chatDB.prompts) chatDB.prompts = {};
                    let customPrompt = chatDB.prompts[botNumber];
                    let promptText;

                    if (customPrompt) {
                        // കസ്റ്റം പ്രോംപ്റ്റിലെ വേരിയബിളുകൾ റീപ്ലേസ് ചെയ്യുന്നു
                        promptText = `${customPrompt.replace(/{botName}/g, botName).replace(/{ownerName}/g, ownerName)}\n\nChat History:\n${historyText}\n\nUser: ${textMessage}\nAssistant:`;
                    } else {
                        // ഡിഫോൾട്ട് പ്രോംപ്റ്റ്
                        promptText = `You are an AI assistant named ${botName}, created by ${ownerName}. STRICT LANGUAGE RULE: Reply in the EXACT SAME LANGUAGE as user. If English, reply in English. If Malayalam, reply in pure Malayalam script. Be friendly, empathetic, and casual. Keep it natural like a human conversation. Do not use robotic patterns.\n\nChat History:\n${historyText}\n\nUser: ${textMessage}\nAssistant:`;
                    }

                    const apis = [
                        `https://eliteprotech-apis.zone.id/chatgpt?prompt=${encodeURIComponent(promptText)}`,
                        `https://jerrycoder.oggyapi.workers.dev/ai/gemini?prompt=${encodeURIComponent(promptText)}`
                    ];

                    for (const apiUrl of apis) {
                        try {
                            const res = await axios.get(apiUrl, { timeout: 15000 });
                            const data = res.data;

                            if (typeof data === "string") {
                                aiReply = data;
                            } else {
                                aiReply = data?.reply || data?.response || data?.result || data?.text || data?.message || "";
                            }

                            if (aiReply) break;
                        } catch (e) {}
                    }

                    if (aiReply) {
                        aiReply = String(aiReply).replace(/ChatGPT|Gemini|Google AI|OpenAI/gi, "AI").trim();

                        global.chatHistory[autoJid].push({ role: 'user', content: textMessage });
                        global.chatHistory[autoJid].push({ role: 'assistant', content: aiReply });

                        if (global.chatHistory[autoJid].length > 6) {
                            global.chatHistory[autoJid] = global.chatHistory[autoJid].slice(global.chatHistory[autoJid].length - 6);
                        }

                        await sock.presenceSubscribe(autoJid);
                        await sock.sendPresenceUpdate('composing', autoJid);

                        setTimeout(async () => {
                            await sock.sendMessage(autoJid, { text: aiReply }, { quoted: autoMsg });
                            await sock.sendPresenceUpdate('paused', autoJid);
                        }, 1000); 
                        
                    }
                } catch (err) {
                    console.error("Chatbot background error handled smoothly.");
                }
            });
            sock.isChatbotHooked = true;
            console.log(`✨ Chatbot Activated Smoothly for bot: ${sock.user.id.split(':')[0]}`);
        }

        if (!input) {
            return await sock.sendMessage(jid, { text: `🤖 *SAFE & SMOOTH CHATBOT*\n\n➤ \`.chatbot on\` / \`.chatbot off\`\n➤ \`.chatbot delete\`\n\n*Status here:* ${chatDB.chats[jid] ? "ON ✅" : "OFF ❌"}` }, { quoted: msg });
        }

        if (input === 'delete' || input === 'clear') {
            global.chatHistory[jid] = [];
            return await sock.sendMessage(jid, { text: "🧹 *AI Memory Cleared for this chat!*" }, { quoted: msg });
        }

        if (input === 'on dms') { chatDB.dms = true; saveDB(); return sock.sendMessage(jid, { text: "✅ Chatbot ON for ALL DMs!" }); }
        if (input === 'off dms') { chatDB.dms = false; saveDB(); return sock.sendMessage(jid, { text: "❌ Chatbot OFF for ALL DMs!" }); }
        if (input === 'on groups') { chatDB.groups = true; saveDB(); return sock.sendMessage(jid, { text: "✅ Chatbot ON for ALL GROUPS!" }); }
        if (input === 'off groups') { chatDB.groups = false; saveDB(); return sock.sendMessage(jid, { text: "❌ Chatbot OFF for ALL GROUPS!" }); }
        if (input === 'on') { chatDB.chats[jid] = true; saveDB(); return sock.sendMessage(jid, { text: `✅ Chatbot turned ON for this chat!` }); }
        if (input === 'off') { chatDB.chats[jid] = false; saveDB(); return sock.sendMessage(jid, { text: `✅ Chatbot turned OFF for this chat!` }); }
    }
};