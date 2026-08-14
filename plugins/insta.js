const axios = require("axios");

module.exports = {
    name: "insta",
    alias: ["ig", "instagram"],
    category: "downloader",
    description: "Instagram Downloader",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;

        let url = (args || []).join(" ").trim();

        // Reply support
        const context =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
            msg.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo;

        const quoted = context?.quotedMessage;

        if (!url && quoted) {
            const text =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                quoted.documentMessage?.caption ||
                "";

            const match =
                text.match(/https?:\/\/[^\s]+/i);

            if (match) {
                url = match[0];
            }
        }

        if (!url || !url.startsWith("http")) {
            return sock.sendMessage(
                jid,
                {
                      text: "❌ Example: .insta <insta link>"
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "⏳",
                    key: msg.key
                }
            });

            // ─── API list (Ninte API aadyam add cheythu) ───
            const apis = [
                `https://kiraxmd-api.vercel.app/api/insta?url=${encodeURIComponent(url)}`, // First Priority
                `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta-v2?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta-v1?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 40000 // Vercel cold start delay handle cheyyan timeout kooti
                    });

                    const d = res.data;

                    console.log(
                        "INSTA API:",
                        api,
                        JSON.stringify(d)
                    );

                    const hasMedia =
                        (Array.isArray(d?.data) &&
                            d.data.length > 0) ||
                        (Array.isArray(d?.result) &&
                            d.result.length > 0) ||
                        d?.url ||
                        d?.video ||
                        d?.data?.url;

                    if (hasMedia) {
                        data = d;
                        console.log(
                            "INSTA API SUCCESS:",
                            api
                        );
                        break;
                    }
                } catch (e) {
                    console.log(
                        "INSTA API FAILED:",
                        api
                    );
                }
            }

            if (!data) {
                throw new Error(
                    "All Instagram APIs failed"
                );
            }

            const postCaption =
                data?.caption ||
                data?.result?.caption ||
                data?.data?.caption ||
                "";

            let items = [];

            if (Array.isArray(data?.data)) {
                items = data.data;
            } else if (
                Array.isArray(data?.result)
            ) {
                items = data.result; // Ninte API-yude structure ithaayathukond ithu automatic aayi work aakum
            } else if (
                data?.url ||
                data?.video
            ) {
                items = [
                    {
                        type: "video",
                        url:
                            data.url ||
                            data.video
                    }
                ];
            }

            if (!items.length) {
                throw new Error(
                    "No media found"
                );
            }

            for (const item of items) {
                const media =
                    item.url ||
                    item.video ||
                    item.download;

                if (!media) continue;

                const type =
                    item.type ||
                    (media.includes(".mp4")
                        ? "video"
                        : "image");

                const caption =
`${postCaption}

> *Downloaded by KIRA X MD*`;

                if (
                    type.toLowerCase() ===
                    "image"
                ) {
                    await sock.sendMessage(
                        jid,
                        {
                            image: {
                                url: media
                            },
                            caption
                        },
                        { quoted: msg }
                    );
                } else {
                    await sock.sendMessage(
                        jid,
                        {
                            video: {
                                url: media
                            },
                            caption
                        },
                        { quoted: msg }
                    );
                }
            }

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (err) {
            console.log(
                "INSTA ERROR:",
                err
            );

            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Download Failed"
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