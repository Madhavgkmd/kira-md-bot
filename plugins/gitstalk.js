const axios = require('axios');

module.exports = {
    name: 'gitstalk', // പേര് മാറ്റി gitstalk എന്നാക്കി
    alias: ['github', 'gh', 'stalkgh', 'ghstalk'], // പഴയ കമാൻഡുകൾ അടിച്ചാലും വർക്ക് ആവാൻ
    category: 'search',
    description: 'Stalk a GitHub user profile',
    usage: `${process.env.PREFIX || '.'}gitstalk <username>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const username = args[0];

        if (!username) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            // ഉദാഹരണത്തിലും gitstalk എന്ന് മാറ്റി
            return sock.sendMessage(jid, { text: `❌ *Please provide a GitHub username!*\n\n➤ Example: \`${process.env.PREFIX || '.'}gitstalk AbhishekSuresh2\`` }, { quoted: msg });
        }

        // ⏳ ലോഡിങ് റിയാക്ഷൻ
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const apiUrl = `https://abhi-api.vercel.app/api/stalk/github?username=${encodeURIComponent(username)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            
            // JSON-ൽ നിന്നും റിസൾട്ട് എടുക്കുന്നു
            const data = res.data?.result || res.data;

            if (!data || !data.login) throw new Error("User not found");

            let caption = `🐙 *GITHUB STALKER* 🐙\n\n`;
            caption += `👤 *Name:* ${data.name || data.login}\n`;
            caption += `🔖 *Username:* ${data.login}\n`;
            if (data.bio) caption += `📝 *Bio:* ${data.bio}\n`;
            caption += `👥 *Followers:* ${data.followers || 0}\n`;
            caption += `🫂 *Following:* ${data.following || 0}\n`;
            caption += `📁 *Public Repos:* ${data.public_repos || 0}\n`;
            caption += `🔗 *Link:* ${data.html_url || `https://github.com/${data.login}`}\n\n`;
            caption += `> *KIRA X MD*`;

            const avatarUrl = data.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

            // പ്രൊഫൈൽ ഫോട്ടോ സഹിതം റിസൾട്ട് അയക്കുന്നു
            await sock.sendMessage(jid, { image: { url: avatarUrl }, caption: caption }, { quoted: msg });
            
            // ✅ സക്സസ് റിയാക്ഷൻ
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("GitHub Stalk Error:", err.message);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ *Failed to fetch GitHub info!*\nMake sure the username is correct.` }, { quoted: msg });
        }
    }
};