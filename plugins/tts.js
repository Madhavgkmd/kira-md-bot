module.exports = {
    name: "tts",
    alias: ["say", "voice"],
    category: "utility",
    description: "Text To Speech",
    usage: ".tts <text>",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;

        let text = args.join(" ").trim();

        // Quoted text support
        if (
            !text &&
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
        ) {
            text =
                msg.message.extendedTextMessage
                    .contextInfo.quotedMessage.conversation;
        }

        if (
            !text &&
            msg.message?.extendedTextMessage?.contextInfo
                ?.quotedMessage?.extendedTextMessage?.text
        ) {
            text =
                msg.message.extendedTextMessage
                    .contextInfo.quotedMessage
                    .extendedTextMessage.text;
        }

        if (!text) {
            return await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ *Give text*\n\nExample:\n.tts Hello Bro"
                },
                { quoted: msg }
            );
        }

        try {

            await sock.sendMessage(
                jid,
                {
                    react: {
                        text: "⏳",
                        key: msg.key
                    }
                }
            );

            let lang = "en";

            // Malayalam detect
            if (/[\u0D00-\u0D7F]/.test(text)) {
                lang = "ml";
            }

            // Optional language tag
            // .tts {ja} konnichiwa
            const langMatch =
                text.match(/\{([a-z]{2})\}/i);

            if (langMatch) {
                lang = langMatch[1];
                text = text
                    .replace(langMatch[0], "")
                    .trim();
            }

            const url =
                `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const arrayBuffer =
                await response.arrayBuffer();

            const audioBuffer =
                Buffer.from(arrayBuffer);

            console.log(
                "TTS SIZE:",
                audioBuffer.length
            );

            if (
                !audioBuffer ||
                audioBuffer.length < 1000
            ) {
                throw new Error(
                    "Invalid audio received"
                );
            }

            // Send as normal audio
            await sock.sendMessage(
                jid,
                {
                    audio: audioBuffer,
                    mimetype: "audio/mpeg"
                },
                { quoted: msg }
            );

            await sock.sendMessage(
                jid,
                {
                    react: {
                        text: "✅",
                        key: msg.key
                    }
                }
            );

        } catch (err) {

            console.log(
                "TTS ERROR:",
                err.message
            );

            await sock.sendMessage(
                jid,
                {
                    react: {
                        text: "❌",
                        key: msg.key
                    }
                }
            );

            await sock.sendMessage(
                jid,
                {
                    text: "❌ TTS Failed"
                },
                { quoted: msg }
            );
        }
    }
};