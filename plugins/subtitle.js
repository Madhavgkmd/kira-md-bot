const axios = require("axios");

module.exports = {
    name: "subtitle",
    alias: ["sub", "subs"],
    category: "search",
    description: "Movie Subtitle Search",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(" ").trim();

        if (!query) {
            return sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Example:\n.subtitle The Goat Life"
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "🔎",
                    key: msg.key
                }
            });

            const api =
                `https://jerrycoder.oggyapi.workers.dev/search/subtitle?q=${encodeURIComponent(query)}`;

            const { data } = await axios.get(api);

            console.log("SUBTITLE RESPONSE:", data);

            const results =
                data?.result ||
                data?.data ||
                [];

            if (!results.length) {
                return sock.sendMessage(
                    jid,
                    {
                        text:
                            `❌ No subtitles found for "${query}".`
                    },
                    { quoted: msg }
                );
            }

            let text =
                `🎬 *Subtitle Results*\n\n`;

            results.slice(0, 10).forEach((item, i) => {
                const title =
                    item.title ||
                    item.name ||
                    "Unknown";

                const lang =
                    item.language ||
                    item.lang ||
                    "Unknown";

                const url =
                    item.url ||
                    item.link ||
                    "No Link";

                text +=
`*${i + 1}.* ${title}
🌐 ${lang}
🔗 ${url}

`;
            });

            text +=
`> *Powered by ${getBotName()}*`;

            await sock.sendMessage(
                jid,
                {
                    text
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
            console.log("SUBTITLE ERROR:", e);

            await sock.sendMessage(
                jid,
                {
                    text:
                        "❌ Subtitle search failed."
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