const axios = require("axios");

module.exports = {
    name: "terabox",
    alias: ["tera", "teradl", "tb"],
    category: "downloader",
    description: "Terabox Downloader",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = args.join(" ").trim();

        if (!url) {
            return sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Example:\n.terabox https://1024terabox.com/s/xxxxx"
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

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/terabx?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/terabx-v1?url=${encodeURIComponent(url)}`
            ];

            let data = null;

            for (const api of apis) {
                try {
                    const res = await axios.get(api, {
                        timeout: 30000
                    });

                    if (res.data) {
                        data = res.data;
                        console.log("TERABOX API SUCCESS:", api);
                        break;
                    }
                } catch (e) {
                    console.log("TERABOX API FAILED:", api);
                }
            }

            if (!data)
                throw new Error("All APIs failed");

            console.log("TERABOX RESPONSE:", data);

            const file =
                data?.result?.download ||
                data?.result?.url ||
                data?.result?.dlink ||
                data?.data?.download ||
                data?.data?.url ||
                data?.data?.dlink ||
                data?.url;

            const title =
                data?.result?.title ||
                data?.data?.title ||
                data?.title ||
                "📦 Terabox File";

            if (!file)
                throw new Error("No download link");

            await sock.sendMessage(
                jid,
                {
                    document: {
                        url: file
                    },
                    mimetype:
                        "application/octet-stream",
                    fileName:
                        `${title}.mp4`,
                    caption:
`${title}

> *Downloaded by ${getBotName()}*`
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
            console.log("TERABOX ERROR:", e);

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