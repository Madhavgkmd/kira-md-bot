const axios = require("axios");

module.exports = {
    name: "translate",
    alias: ["tr"],
    category: "tools",
    description: "Translate text",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        let text = "";
        let lang = "ml";

        // Reply support
        const context =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
            msg.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo;

        const quoted = context?.quotedMessage;

        if (quoted) {
            text =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                quoted.documentMessage?.caption ||
                "";
        }

        // Command arguments
        if (args.length) {
            if (
                args[0].length <= 5 &&
                /^[a-z-]+$/i.test(args[0])
            ) {
                lang = args[0].toLowerCase();

                if (args.length > 1) {
                    text = args.slice(1).join(" ");
                }
            } else {
                text = args.join(" ");
            }
        }

        if (!text) {
            return sock.sendMessage(
                jid,
                {
                    text:
`🌐 *Translator*

Example:
.tr Hello Bro
.tr ja Hello Bro
.tr hi Hello Bro
Reply to a message:
.tr ja

📌 Language Codes:
en - English
ml - Malayalam
hi - Hindi
ta - Tamil
te - Telugu
kn - Kannada
ja - Japanese
ko - Korean
zh - Chinese
ar - Arabic
fr - French
de - German
es - Spanish
ru - Russian`
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "🌐",
                    key: msg.key
                }
            });

            const api =
                `https://api-aswin-sparky.koyeb.app/api/search/translate?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;

            const { data } = await axios.get(api);

            const translated =
                data?.result ||
                data?.translation ||
                data?.translated ||
                data?.data ||
                "No translation found.";

            await sock.sendMessage(
                jid,
                {
                    text:
`🌐 *Translation (${lang})*

${translated}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (e) {
            console.log("TRANSLATE ERROR:", e);

            await sock.sendMessage(
                jid,
                {
                    text: "❌ Translation Failed"
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });
        }
    }
};