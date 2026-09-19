const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'ptv',
    alias: ['videonote', 'roundvideo'],
    category: 'media',
    description: 'Convert a normal video into a round video note (PTV)',
    usage: '.ptv <reply to a video>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        // മെസ്സേജിൽ റിപ്ലൈ ഉണ്ടോ എന്ന് നോക്കുന്നു
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo || 
                            msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
                            msg.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo;

        const quoted = contextInfo?.quotedMessage;

        // റിപ്ലൈ ചെയ്തത് ഒരു വീഡിയോ ആണോ എന്ന് ഉറപ്പുവരുത്തുന്നു
        if (!quoted || !quoted.videoMessage) {
            return await sock.sendMessage(
                jid, 
                { text: "❌ *Please reply to a video to convert it into a round video!*" }, 
                { quoted: msg }
            );
        }

        try {
            // പ്രോസസ്സ് ചെയ്യുന്ന സമയത്ത് ഒരു റിയാക്ഷൻ കാണിക്കുന്നു
            await sock.sendMessage(jid, { react: { text: "🔄", key: msg.key } });

            // വീഡിയോ ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                "buffer",
                {},
                { 
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            // ഡൗൺലോഡ് ചെയ്ത വീഡിയോ റൗണ്ട് വീഡിയോ ആയി (ptv: true) തിരികെ അയക്കുന്നു
            await sock.sendMessage(
                jid, 
                { 
                    video: mediaBuffer, 
                    ptv: true  // ഈ വരിയാണ് വീഡിയോയെ റൗണ്ട് ആക്കുന്നത്
                }, 
                { quoted: msg }
            );

            // കഴിഞ്ഞ ശേഷം success റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('PTV Conversion Error:', error);
            
            await sock.sendMessage(
                jid, 
                { text: `❌ *Failed to convert video:* ${error.message}` }, 
                { quoted: msg }
            );
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};