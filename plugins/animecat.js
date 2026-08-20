const axios = require('axios');

// കോമൺ ആയി ഡാറ്റ ഫെച്ച് ചെയ്യാൻ (Smart Parser)
async function fetchMedia(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 25000 });
    const contentType = res.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
        const json = JSON.parse(res.data.toString('utf-8'));
        if (url.includes('couplepp')) return json.result || json.data || json; 

        let mediaUrl = json.url || json.image || json.video || json.result || json.data?.url;
        if (!mediaUrl) throw new Error("Could not extract media URL.");

        const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 25000 });
        return mediaRes.data;
    }
    return res.data;
}

module.exports = [
    // 1. ASTATUS
    {
        name: 'astatus',
        alias: ['animestatus'],
        category: 'anime',
        description: 'Anime status video',
        usage: '.astatus',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/astatus');
                await sock.sendMessage(jid, { video: buffer, caption: `⛩️ *Anime Status*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 2. COUPLEPP
    {
        name: 'couplepp',
        alias: ['couple'],
        category: 'anime',
        description: 'Matching anime couple DPs',
        usage: '.couplepp',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const data = await fetchMedia('https://abhi-api.vercel.app/api/anime/couplepp');
                let maleUrl = data.male || data.boy || data.m || data.result?.male;
                let femaleUrl = data.female || data.girl || data.f || data.result?.female;

                const maleBuffer = await axios.get(maleUrl, { responseType: 'arraybuffer' });
                const femaleBuffer = await axios.get(femaleUrl, { responseType: 'arraybuffer' });

                await sock.sendMessage(jid, { image: maleBuffer.data, caption: `👦 *Boy DP*` }, { quoted: msg });
                await sock.sendMessage(jid, { image: femaleBuffer.data, caption: `👧 *Girl DP*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 3. ITACHI
    {
        name: 'itachi',
        category: 'anime',
        description: 'Random Itachi image',
        usage: '.itachi',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/itachi');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Itachi Uchiha*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 4. NARUTO
    {
        name: 'naruto',
        category: 'anime',
        description: 'Random Naruto image',
        usage: '.naruto',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/naruto');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Naruto Uzumaki*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 5. NEZUKO
    {
        name: 'nezuko',
        category: 'anime',
        description: 'Random Nezuko image',
        usage: '.nezuko',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/nezuko');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Nezuko Kamado*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 6. MIKU
    {
        name: 'miku',
        category: 'anime',
        description: 'Random Miku image',
        usage: '.miku',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/miku');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Hatsune Miku*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 7. ITORI
    {
        name: 'itori',
        alias: ['itadori'],
        category: 'anime',
        description: 'Random Itori image',
        usage: '.itori',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/itori');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Itori*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    },
    // 8. LOLI
    {
        name: 'loli',
        category: 'anime',
        description: 'Random anime loli image',
        usage: '.loli',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            try {
                const buffer = await fetchMedia('https://abhi-api.vercel.app/api/anime/loli');
                await sock.sendMessage(jid, { image: buffer, caption: `⛩️ *Anime Loli*` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (e) {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: '❌ Something went wrong, please try again later.' }, { quoted: msg });
            }
        }
    }
];