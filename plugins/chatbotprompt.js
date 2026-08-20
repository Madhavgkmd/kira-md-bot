// plugins/chatbotprompt.js - KIRA X MD
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../chatbot_db.json');

module.exports = {
    name: 'chatbotprompt',
    alias: ['setprompt'],
    category: 'owner', // മെനുവിൽ ഇത് സാധാരണ കാണിക്കില്ല (ഓണർ ഹൈഡൻ കമാൻഡ്)
    description: 'Set custom prompt for AI Chatbot',
    usage: '.chatbotprompt <your prompt>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // ഓണർ ചെക്കിങ്
        const isOwner = msg.key.fromMe || (process.env.OWNER_NUMBER && sender.includes(process.env.OWNER_NUMBER));
        if (!isOwner) return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });

        const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, "");
        const newPrompt = args.join(' ').trim();

        // ഡാറ്റാബേസ് ലോഡ് ചെയ്യുന്നു
        let chatDB = { dms: false, groups: false, chats: {}, prompts: {} };
        try {
            if (fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf-8');
                if (data) chatDB = JSON.parse(data);
            }
        } catch (err) {}

        if (!chatDB.prompts) chatDB.prompts = {};

        // കമാൻഡ് മാത്രം അടിച്ചാൽ നിലവിലെ പ്രോംപ്റ്റ് കാണിക്കും
        if (!newPrompt) {
            const currentPrompt = chatDB.prompts[botNumber] || "Default KIRA Prompt";
            return await sock.sendMessage(jid, { 
                text: `🤖 *CURRENT PROMPT*\n\n${currentPrompt}\n\n*To change:* .chatbotprompt <new prompt>\n*To reset:* .chatbotprompt reset` 
            }, { quoted: msg });
        }

        // Reset അടിച്ചാൽ ഡിഫോൾട്ട് ആകും
        if (newPrompt.toLowerCase() === 'reset') {
            delete chatDB.prompts[botNumber];
            fs.writeFileSync(dbPath, JSON.stringify(chatDB, null, 2));
            return await sock.sendMessage(jid, { text: "✅ *Prompt reset to default successfully!*" }, { quoted: msg });
        }

        // പുതിയ പ്രോംപ്റ്റ് സേവ് ചെയ്യുന്നു
        chatDB.prompts[botNumber] = newPrompt;
        fs.writeFileSync(dbPath, JSON.stringify(chatDB, null, 2));

        await sock.sendMessage(jid, { 
            text: `✅ *Custom Prompt Set Successfully!*\n\n📝 New Prompt: ${newPrompt}` 
        }, { quoted: msg });
    }
};