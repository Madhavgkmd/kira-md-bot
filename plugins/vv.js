const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "vv",
    alias: ["viewonce", "retrieve"],
    category: "tools",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        try {
            // 🚨 FIX: കമാൻഡ് മെസ്സേജ് Disappearing ആണെങ്കിലും കൃത്യമായി വായിക്കാൻ 🚨
            const actualMessage = msg.message?.ephemeralMessage?.message || 
                                  msg.message?.viewOnceMessage?.message || 
                                  msg.message;

            const quoted = actualMessage?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return sock.sendMessage(
                    jid,
                    { text: "❌ *Reply to a View Once message!*" },
                    { quoted: msg }
                );
            }

            // വ്യൂ വൺസ് ഡാറ്റ എടുക്കുന്നു (v1, v2, v2Extension സപ്പോർട്ട്)
            const viewOnce = quoted.viewOnceMessage?.message ||
                           quoted.viewOnceMessageV2?.message ||
                           quoted.viewOnceMessageV2Extension?.message || 
                           quoted;

            const media = viewOnce.imageMessage || viewOnce.videoMessage;

            if (!media || !media.viewOnce) {
                // ചിലപ്പോൾ ഡയറക്റ്റ് quotedMessage-ൽ തന്നെ വ്യൂ വൺസ് വരാം, അതിനായുള്ള എക്സ്ട്രാ ചെക്കിംഗ്
                const isRealViewOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension || media?.viewOnce;
                
                if (!isRealViewOnce) {
                    return sock.sendMessage(
                        jid,
                        { text: "❌ *Replied message is not a View Once photo/video!*" },
                        { quoted: msg }
                    );
                }
            }

            // ഡൗൺലോഡ് തുടങ്ങുന്നു എന്ന് കാണിക്കാൻ റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

            const type = media.mimetype.startsWith("image") ? "image" : "video";
            const stream = await downloadContentFromMessage(media, type);

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // ഒറിജിനൽ വ്യൂ വൺസ് മെസ്സേജിൽ ക്യാപ്ഷൻ ഉണ്ടെങ്കിൽ അത് എടുക്കുന്നു (വാട്ടർമാർക്കുകൾ ഇല്ല)
            const originalCaption = media.caption || "";

            if (type === "image") {
                await sock.sendMessage(
                    jid,
                    { image: buffer, caption: originalCaption },
                    { quoted: msg }
                );
            } else {
                await sock.sendMessage(
                    jid,
                    { video: buffer, caption: originalCaption },
                    { quoted: msg }
                );
            }

            // സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("VV ERROR:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: `❌ *Error:* ${err.message}` },
                { quoted: msg }
            );
        }
    }
};