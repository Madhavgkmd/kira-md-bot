const axios = require('axios');

module.exports = [
    // ─── 1. NARUTO VIDEO ───
    {
        name: 'narutovid',
        category: 'anime',
        description: 'Random Naruto video',
        usage: '.naruto',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
                const { data } = await axios.get('https://jerrycoder.oggyapi.workers.dev/anime/naruto?json=true', { timeout: 15000 });
                if (!data?.url) throw new Error("Video URL not found");
                
                await sock.sendMessage(jid, { video: { url: data.url }, caption: `🎬 *Naruto Uzumaki*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 2. ONE PIECE VIDEO ───
    {
        name: 'onepiece',
        category: 'anime',
        description: 'Random One Piece video',
        usage: '.onepiece',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
                const { data } = await axios.get('https://jerrycoder.oggyapi.workers.dev/anime/onepiece?json=true', { timeout: 15000 });
                if (!data?.url) throw new Error("Video URL not found");
                
                await sock.sendMessage(jid, { video: { url: data.url }, caption: `🎬 *One Piece*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 3. TIKTOK STALKER ───
    {
        name: 'tiktok',
        alias: ['ttstalk'],
        category: 'stalker',
        description: 'Stalk TikTok profile',
        usage: '.tiktok <username>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const input = args.join(" ").trim();
            if (!input) return await sock.sendMessage(jid, { text: '❌ *Provide a username!*\n_Example: .tiktok khaby.lame_' }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
                const { data } = await axios.get(`https://jerrycoder.oggyapi.workers.dev/stalk/tiktok?user=${encodeURIComponent(input)}`, { timeout: 15000 });
                if (data.status !== "success") return await sock.sendMessage(jid, { text: '❌ *User not found!*' }, { quoted: msg });
                
                const res = data.result;
                const caption = `👤 *TIKTOK STALKER*\n\n📛 *Name:* ${res.nickname}\n🔹 *Username:* @${res.username}\n👥 *Followers:* ${res.followers}\n👤 *Following:* ${res.following}\n❤️ *Likes:* ${res.likes}\n🎬 *Videos:* ${res.videos}\n📝 *Bio:* ${res.bio || 'N/A'}`;
                
                await sock.sendMessage(jid, { image: { url: res.avatar }, caption: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 4. PINTEREST STALKER ───
    {
        name: 'pin',
        category: 'stalker',
        description: 'Stalk Pinterest profile',
        usage: '.pin <username>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const input = args.join(" ").trim();
            if (!input) return await sock.sendMessage(jid, { text: '❌ *Provide a username!*\n_Example: .pin Jerry_' }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
                const { data } = await axios.get(`https://jerrycoder.oggyapi.workers.dev/stalk/pin?user=${encodeURIComponent(input)}`, { timeout: 15000 });
                if (data.status !== "success") return await sock.sendMessage(jid, { text: '❌ *User not found!*' }, { quoted: msg });
                
                const res = data.result;
                const imageUrl = res.image || "https://i.pinimg.com/736x/82/38/c7/8238c715971a80d4bd71e72fcda7f2a1.jpg"; 
                const caption = `📌 *PINTEREST STALKER*\n\n📛 *Name:* ${res.name}\n🔹 *Username:* @${res.username}\n👥 *Followers:* ${res.followers}\n👤 *Following:* ${res.following}\n📋 *Boards:* ${res.boards}\n📝 *Bio:* ${res.bio || 'N/A'}\n🔗 *Link:* ${res.profile_url}`;
                
                await sock.sendMessage(jid, { image: { url: imageUrl }, caption: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 5. INSTAGRAM STALKER ───
    {
        name: 'insta',
        alias: ['igstalk'],
        category: 'stalker',
        description: 'Stalk Instagram profile',
        usage: '.insta <username>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const input = args.join(" ").trim();
            if (!input) return await sock.sendMessage(jid, { text: '❌ *Provide a username!*\n_Example: .insta ohh.itsjerry_' }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
                const { data } = await axios.get(`https://jerrycoder.oggyapi.workers.dev/stalk/insta?user=${encodeURIComponent(input)}`, { timeout: 15000 });
                if (data.status !== "success") return await sock.sendMessage(jid, { text: '❌ *User not found!*' }, { quoted: msg });
                
                const res = data.result;
                const caption = `📸 *INSTAGRAM STALKER*\n\n📛 *Name:* ${res.name || 'N/A'}\n🔹 *Username:* @${res.username}\n👥 *Followers:* ${res.follower}\n👤 *Following:* ${res.following}\n🖼️ *Posts:* ${res.post}\n🔒 *Private:* ${res.private ? 'Yes' : 'No'}\n📝 *Bio:* ${res.about || 'N/A'}\n🔗 *Link:* ${res.profile}`;
                
                await sock.sendMessage(jid, { image: { url: res.photo }, caption: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 6. GITHUB STALKER ───
    {
        name: 'github',
        alias: ['ghstalk'],
        category: 'stalker',
        description: 'Stalk GitHub profile',
        usage: '.github <username>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const input = args.join(" ").trim();
            if (!input) return await sock.sendMessage(jid, { text: '❌ *Provide a username!*\n_Example: .github torvalds_' }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
                const { data } = await axios.get(`https://jerrycoder.oggyapi.workers.dev/stalk/github?user=${encodeURIComponent(input)}`, { timeout: 15000 });
                if (data.status !== "success") return await sock.sendMessage(jid, { text: '❌ *User not found!*' }, { quoted: msg });
                
                const res = data.result;
                const caption = `🐙 *GITHUB STALKER*\n\n📛 *Name:* ${res.name}\n🔹 *Username:* @${res.username}\n👥 *Followers:* ${res.followers}\n👤 *Following:* ${res.following}\n📁 *Repos:* ${res.public_repo}\n📍 *Location:* ${res.location || 'N/A'}\n📝 *Bio:* ${res.bio || 'N/A'}\n🔗 *Link:* ${res.profile_url}`;
                
                await sock.sendMessage(jid, { image: { url: res.profile }, caption: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 7. APPLE MUSIC DOWNLOADER ───
    {
        name: 'applem',
        category: 'download',
        description: 'Download Apple Music track',
        usage: '.applem <url>',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const input = args.join(" ").trim();
            if (!input) return await sock.sendMessage(jid, { text: '❌ *Provide an Apple Music URL!*' }, { quoted: msg });
            
            try {
                await sock.sendMessage(jid, { react: { text: '⬇️', key: msg.key } });
                
                const { data } = await axios.get(`https://jerrycoder.oggyapi.workers.dev/down/applem?url=${encodeURIComponent(input)}`, { timeout: 20000 });
                if (data.status !== "success") return await sock.sendMessage(jid, { text: '❌ *Failed to fetch track!*' }, { quoted: msg });
                
                const res = data.result;

                // Download audio directly as buffer to prevent blank messages
                const audioResponse = await axios.get(res.download, { responseType: 'arraybuffer', timeout: 30000 });
                const audioBuffer = Buffer.from(audioResponse.data);

                // Send as normal audio without thumbnail
                await sock.sendMessage(jid, { 
                    audio: audioBuffer, 
                    mimetype: 'audio/mpeg', 
                    ptt: false
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 8. ANIME QUOTE ───
    {
        name: "animequote",
        alias: ["quote", "aq"],
        category: "fun",
        description: "Get a random anime quote",
        usage: ".quote",
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "💬", key: msg.key } });
                const { data } = await axios.get("https://api.rei.my.id/animequotes?limit=20", { timeout: 15000 });
                const quotes = data?.data || data?.results || data;
                
                if (!quotes || quotes.length === 0) throw new Error("No quotes found");
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                
                const caption = `💬 *"${randomQuote.quote || randomQuote.english}"*\n\n👤 *Character:* ${randomQuote.character}\n⛩️ *Anime:* ${randomQuote.anime}`;
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },

    // ─── 9. JOKE COMMAND ───
    {
        name: "joke",
        category: "fun",
        description: "Get a random joke",
        usage: ".joke",
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "😂", key: msg.key } });
                const { data } = await axios.get("https://api.rei.my.id/jokes?limit=15", { timeout: 15000 });
                const jokes = data?.data || data?.results || data;
                
                if (!jokes || jokes.length === 0) throw new Error("No jokes found");
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                
                const caption = `🎭 *R A N D O M  J O K E*\n\n${randomJoke.joke || randomJoke.text}`;
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    }
];

