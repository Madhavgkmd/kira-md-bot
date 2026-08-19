const axios = require("axios");

module.exports = {
    name: "enhance",
    alias: ["hd", "enhanceimg", "upscale"],
    category: "ai",
    description: "AI Image Enhancer",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prompt = args.join(" ").trim() || "enhance image";

        const context =
            msg.message?.extendedTextMessage?.contextInfo;

        const quoted =
            context?.quotedMessage;

        if (!quoted?.imageMessage) {
            return sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Reply to an image with .enhance"
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "🪄",
                    key: msg.key
                }
            });

            // Download quoted image
            const buffer =
                await sock.downloadMediaMessage({
                    message: quoted,
                    key: {
                        remoteJid: jid,
                        id: context.stanzaId,
                        participant: context.participant
                    }
                });

            // Upload image somewhere
            const { default: FormData } =
                require("form-data");

            const form = new FormData();
            form.append(
                "file",
                buffer,
                "image.jpg"
            );

            // Replace this with your uploader if needed
            const upload =
                await axios.post(
                    "https://cdnfile.pages.dev/upload",
                    form,
                    {
                        headers:
                            form.getHeaders()
                    }
                );

            const imageUrl =
                upload.data.url;

            const api =
                `https://jerrycoder.oggyapi.workers.dev/ai/editimg?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`;

            const { data } =
                await axios.get(api);

            const image =
                data?.result?.url ||
                data?.result ||
                data?.url;

            if (!image)
                throw new Error(
                    "No image returned"
                );

            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: image
                    },
                    caption:
`🪄 *Image Enhanced*

> *Powered by ${global.config?.BOT_NAME || 'KIRA X MD'}*`
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
            console.log(
                "ENHANCE ERROR:",
                e
            );

            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Image enhancement failed."
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