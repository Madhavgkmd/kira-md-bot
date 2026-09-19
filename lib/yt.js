const axios = require('axios');

// ഒന്നിലധികം API-കൾ ഒരേസമയം സെറ്റ് ചെയ്യുന്നു (Backup ഉള്ളതുകൊണ്ട് പെട്ടെന്ന് ഫെയിൽ ആവില്ല)
const searchApis = [
    'https://api.siputzx.my.id/api/s/ytsearch?query=',
    'https://api.ryzendesu.vip/api/search/ytsearch?query='
];

async function searchYoutube(query, limit = 10) {
    for (const baseUrl of searchApis) {
        try {
            const url = `${baseUrl}${encodeURIComponent(query)}`;
            const res = await axios.get(url, { timeout: 10000 });
            
            // 💡 ഇവിടെ ഡാറ്റ എങ്ങനെയാണെന്ന് ലോഗ് ചെയ്യും, എറർ വന്നാൽ പെട്ടെന്ന് മനസ്സിലാക്കാം
            console.log("API Response Structure:", JSON.stringify(res.data, null, 2));

            // എല്ലാ API-കളുടെയും റെസ്പോൺസ് രീതികൾ ചെക്ക് ചെയ്യുന്നു
            const results = res.data.result || res.data.data || [];
            
            if (results && results.length > 0) {
                return results.slice(0, limit).map(v => ({
                    id: v.id || v.videoId || 'unknown',
                    title: v.title || 'Untitled',
                    url: v.url || `https://youtube.com/watch?v=${v.id || v.videoId}`,
                    duration: v.duration || '0:00',
                    views: v.views || 0,
                    channel: v.channel || { name: 'Unknown' }
                }));
            }
        } catch (e) {
            console.log(`API Failed: ${baseUrl}`);
            continue; // ഒരു API വർക്ക് ആയില്ലെങ്കിൽ അടുത്തതിലേക്ക് പോകും
        }
    }
    return []; // ഒന്നും കിട്ടിയില്ലെങ്കിൽ വെറും Array റിട്ടേൺ ചെയ്യും
}

// ഡൗൺലോഡ് ഫംഗ്ഷനുകൾ
async function downloadAudio(url) {
    // ഓഡിയോയ്ക്ക് വേണ്ടി പുതിയ API ലിങ്ക് (നിന്റെ പഴയത് ഡൗൺ ആണെങ്കിൽ ഇത് വർക്ക് ആവും)
    const api = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`;
    const res = await axios.get(api);
    return { path: res.data.result.url, title: res.data.result.title };
}

async function downloadVideo(url) {
    const api = `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`;
    const res = await axios.get(api);
    return { path: res.data.result.url };
}

module.exports = { searchYoutube, downloadAudio, downloadVideo };