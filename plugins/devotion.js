const axios = require('axios');

// ==========================================
// 📜 QUOTES DATABASES
// ==========================================
const GITA_QUOTES = [
    { quote: "You have a right to perform your duty, but not to the fruits of your actions.", speaker: "Krishna", verse: "Bhagavad Gita 2.47" },
    { quote: "The soul is never born, nor does it ever die.", speaker: "Krishna", verse: "Bhagavad Gita 2.20" },
    { quote: "Just as a person changes worn-out clothes for new ones, the soul accepts new bodies.", speaker: "Krishna", verse: "Bhagavad Gita 2.22" },
    { quote: "Weapons cannot cut the soul, fire cannot burn it, water cannot wet it, and wind cannot dry it.", speaker: "Krishna", verse: "Bhagavad Gita 2.23" },
    { quote: "The soul is eternal, all-pervading, immovable and everlasting.", speaker: "Krishna", verse: "Bhagavad Gita 2.24" },
    { quote: "The unreal has no existence, while the real never ceases to exist.", speaker: "Krishna", verse: "Bhagavad Gita 2.16" },
    { quote: "The wise are not disturbed by pleasure and pain.", speaker: "Krishna", verse: "Bhagavad Gita 2.15" },
    { quote: "Perform your duty without attachment to the results.", speaker: "Krishna", verse: "Bhagavad Gita 2.47" },
    { quote: "Yoga is the state of equanimity.", speaker: "Krishna", verse: "Bhagavad Gita 2.48" },
    { quote: "When meditation is mastered, the mind is unwavering like the flame of a lamp in a windless place.", speaker: "Krishna", verse: "Bhagavad Gita 6.19" }
];

const RAMAYANA_QUOTES = [
    "Dharma is the path that remains right even when it is difficult.",
    "A promise is sacred when it is kept even at the cost of comfort.",
    "Lord Rama showed that righteousness is greater than power.",
    "True strength is remaining calm when anger would be easier.",
    "Courage is walking toward duty even when the road is uncertain.",
    "A noble heart chooses dharma over personal desire.",
    "Rama's life teaches that truth may be difficult, but it never loses its value.",
    "Hanuman teaches us that devotion can transform impossible tasks into possible ones.",
    "Where there is sincere devotion, fear becomes smaller.",
    "Strength becomes meaningful only when it is used for the protection of others."
];

module.exports = [
    // ==========================================
    // 🕉️ GITA & KRISHNA QUOTES
    // ==========================================
    {
        name: 'gitaquotes',
        alias: ['gitaquote', 'randomgita'],
        category: 'devotion',
        description: 'Get a random quote from the Bhagavad Gita',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🕉️", key: msg.key } });
                const randomQuote = GITA_QUOTES[Math.floor(Math.random() * GITA_QUOTES.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `📜 *Bhagavad Gita Quote*\n\n"${randomQuote.quote}"\n\n— _${randomQuote.speaker}_ (${randomQuote.verse})` 
                }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },
    {
        name: 'krishnaquotes',
        alias: ['krishnaquote'],
        category: 'devotion',
        description: 'Get a random Krishna quote',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🦚", key: msg.key } });
                const krishnaOnlyQuotes = GITA_QUOTES.filter(q => q.speaker === "Krishna");
                const randomQuote = krishnaOnlyQuotes[Math.floor(Math.random() * krishnaOnlyQuotes.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `🦚 *Lord Krishna Says:*\n\n"${randomQuote.quote}"\n\n— _(${randomQuote.verse})_` 
                }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // 🏹 RAMAYANA QUOTES
    // ==========================================
    {
        name: 'ramayanaquotes',
        alias: ['ramayanaquote', 'ramquote'],
        category: 'devotion',
        description: 'Get a random quote from the Ramayana',
        async execute(sock, msg) {
            const jid = msg.key.remoteJid;
            try {
                await sock.sendMessage(jid, { react: { text: "🏹", key: msg.key } });
                const randomQuote = RAMAYANA_QUOTES[Math.floor(Math.random() * RAMAYANA_QUOTES.length)]; 
                
                await sock.sendMessage(jid, { 
                    text: `🏹 *Ramayana Quote*\n\n"${randomQuote}"` 
                }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await sock.sendMessage(jid, { text: "❌ *Error sharing quote!*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // 📖 GITA CHAPTER & VERSE (API)
    // ==========================================
    {
        name: 'gitachapter',
        alias: ['readgita'],
        category: 'devotion',
        description: 'Read a specific chapter summary from Bhagavad Gita',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const chapterNum = args[0];

            if (!chapterNum || isNaN(chapterNum) || chapterNum < 1 || chapterNum > 18) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: .gitachapter 1_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "📖", key: msg.key } });
                const res = await axios.get(`https://vedicscriptures.github.io/chapter/${chapterNum}`);
                
                if (res.data && res.data.summary) {
                    const title = res.data.translation || res.data.name;
                    const summaryText = res.data.summary.en; 
                    await sock.sendMessage(jid, { 
                        text: `📖 *Bhagavad Gita - Chapter ${chapterNum}*\n*${title}*\n\n${summaryText}` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: "❌ *Chapter not found or API Error!*" }, { quoted: msg });
            }
        }
    },
    {
        name: 'gitaverse',
        alias: ['gitashlok'],
        category: 'devotion',
        description: 'Read a specific verse from Bhagavad Gita',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;

            if (!args[0] || !args[1] || isNaN(args[0]) || isNaN(args[1])) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: .gitaverse 1 1_ (Chapter 1, Verse 1)` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
                const res = await axios.get(`https://vedicscriptures.github.io/slok/${args[0]}/${args[1]}`);
                
                if (res.data && res.data.slok) {
                    const shlok = res.data.slok;
                    const translation = res.data.siva ? res.data.siva.et : res.data.purohit.et; 
                    
                    await sock.sendMessage(jid, { 
                        text: `📜 *Bhagavad Gita - ${args[0]}:${args[1]}*\n\n${shlok}\n\n*Translation:*\n${translation}` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Verse not found. Check Chapter and Verse numbers.*` }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // ☪️ QURAN COMMANDS (API - HTTPS Fixed)
    // ==========================================
    {
        name: 'quranverse',
        alias: ['qverse', 'ayat'],
        category: 'devotion',
        description: 'Get a specific Quran verse in English',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;

            if (!args[0] || !args[1] || isNaN(args[0]) || isNaN(args[1])) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: .quranverse 2 255_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "☪️", key: msg.key } });
                const url = `https://api.alquran.cloud/v1/ayah/${args[0]}:${args[1]}/en.asad`;
                const res = await axios.get(url, { timeout: 15000 });

                if (res.data && res.data.data) {
                    const surahName = res.data.data.surah.englishName;
                    const verseText = res.data.data.text;
                    
                    await sock.sendMessage(jid, { 
                        text: `📖 *The Noble Quran*\n\n*Surah ${surahName} (${args[0]}), Ayat ${args[1]}*\n"${verseText}"` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Verse not found. Check Surah and Ayat numbers.*` }, { quoted: msg });
            }
        }
    },
    {
        name: 'quranchapter',
        alias: ['readquran', 'surah'],
        category: 'devotion',
        description: 'Read a full Surah (Chapter) from the Quran in English',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const chapter = args[0];

            if (!chapter || isNaN(chapter) || chapter < 1 || chapter > 114) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: .quranchapter 1_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "📖", key: msg.key } });
                const url = `https://api.alquran.cloud/v1/surah/${chapter}/en.asad`;
                const res = await axios.get(url, { timeout: 20000 });
                
                if (res.data && res.data.data && res.data.data.ayahs) {
                    const surahName = res.data.data.englishName;
                    const versesText = res.data.data.ayahs.map(v => `*${v.numberInSurah}.* ${v.text}`).join("\n\n");
                    
                    await sock.sendMessage(jid, { 
                        text: `📖 *The Noble Quran - Surah ${surahName}*\n\n${versesText}` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: "❌ *Could not fetch the Surah API.*" }, { quoted: msg });
            }
        }
    },

    // ==========================================
    // ✝️ HOLY BIBLE COMMANDS (API Fixed & Smarter)
    // ==========================================
    {
        name: 'bibleverse',
        alias: ['verse', 'biblechapter', 'readbible'],
        category: 'devotion',
        description: 'Get a specific Bible verse or chapter',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const query = args.join(" ").trim();

            if (!query) {
                return await sock.sendMessage(jid, { text: `⚠️ *Format Error!*\n_Example: .bibleverse John 3:16_\n_Example: .bibleverse Genesis 1_` }, { quoted: msg });
            }

            try {
                await sock.sendMessage(jid, { react: { text: "✝️", key: msg.key } });
                
                // 🔥 പുതിയ Bible API (ഇത് Verse-ഉം Chapter-ഉം എല്ലാം ഒറ്റയടിക്ക് സപ്പോർട്ട് ചെയ്യും)
                const res = await axios.get(`https://bible-api.com/${encodeURIComponent(query)}`, { timeout: 15000 });
                
                if (res.data && res.data.text) {
                    const reference = res.data.reference;
                    const text = res.data.text.trim();
                    
                    await sock.sendMessage(jid, { 
                        text: `📖 *Holy Bible*\n\n*${reference}*\n"${text}"` 
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                }
            } catch (err) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Verse/Chapter not found. Please check the spelling.*` }, { quoted: msg });
            }
        }
    }
];