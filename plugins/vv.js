const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");

module.exports = [
    {
        name: "vv",
        alias: ["viewonce", "retrieve"],
        category: "tools",
        description: "Retrieve View Once images and videos",
        usage: ".vv (reply to a view once message)",

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
    },
    {
        name: "ss",
        alias: ["screenshot", "webss"],
        category: "tools",
        description: "Take a full page screenshot of a website",
        usage: ".ss <website url>",

        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const url = args.join(" ").trim();

            if (!url) {
                return await sock.sendMessage(jid, { text: "❌ *Please provide a website URL!*" }, { quoted: msg });
            }

            // ലിങ്ക് വാലിഡ് ആണോ എന്ന് സിമ്പിൾ ആയി ചെക്ക് ചെയ്യുന്നു
            const validUrl = url.startsWith("http") ? url : `https://${url}`;

            await sock.sendMessage(jid, { react: { text: "📸", key: msg.key } });

            try {
                // ബ്രോ തന്ന API വെച്ച് സ്ക്രീൻഷോട്ട് എടുക്കുന്നു
                const apiUrl = `https://jerrycoder.oggyapi.workers.dev/tool/fullss?url=${encodeURIComponent(validUrl)}`;
                
                // API ഒരു ഇമേജ് ബഫർ ആയിരിക്കും തരുന്നത് എന്ന് കരുതുന്നു
                const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
                
                if (!response.data) throw new Error("Failed to capture screenshot");

                const imageBuffer = Buffer.from(response.data, "binary");

                await sock.sendMessage(jid, {
                    image: imageBuffer,
                    caption: `🌐 *Screenshot Captured*\n🔗 ${validUrl}`
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (error) {
                console.error("SS ERROR:", error.message);
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: "❌ *Failed to capture screenshot! Make sure the link is correct.*" }, { quoted: msg });
            }
        }
    }
];