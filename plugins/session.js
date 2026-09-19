const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");

module.exports = {
    name: "session",
    alias: ["getsession"],
    category: "owner",
    execute: async (sock, msg, args) => {
        const jid = msg.key.remoteJid;
        const sessionPath = "./session/creds.json";
        if (fs.existsSync(sessionPath)) {
            const credsData = fs.readFileSync(sessionPath, 'utf8');
            const sessionId = Buffer.from(credsData).toString('base64');
            // Send only the session ID as text
            await sock.sendMessage(jid, { text: sessionId }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { text: "Session not found" }, { quoted: msg });
        }
    }
};