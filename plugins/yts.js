const yts = require("yt-search");

module.exports = {
    name: "yts",
    alias: ["ysearch"],
    category: "search",
    description: "Search YouTube videos",
    usage: ".yts <query>",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(
                jid,
                {
                    text:
`🔎 *YouTube Search*

Example:
.yts Death Note`
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

            const result = await yts(query);

            const videos =
                result.videos.slice(0, 10);

            if (!videos.length) {
                return await sock.sendMessage(
                    jid,
                    {
                        text:
`❌ No results found for:

${query}`
                    },
                    { quoted: msg }
                );
            }

            let text =
`╭━━━〔 YOUTUBE SEARCH 〕━━━⬣

🔎 Query: ${query}
📦 Results: ${videos.length}

`;

            for (let i = 0; i < videos.length; i++) {

                const v = videos[i];

                text +=
`${i + 1}. *${v.title}*
⏱ ${v.timestamp}
👤 ${v.author.name}
👁 ${v.views.toLocaleString()} views
🔗 ${v.url}

`;
            }

            text +=
"╰━━━━━━━━━━━━━━⬣";

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

        } catch (err) {

            console.log(
                "YTS ERROR:",
                err
            );

            await sock.sendMessage(
                jid,
                {
                    text:
"❌ Failed to search YouTube."
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