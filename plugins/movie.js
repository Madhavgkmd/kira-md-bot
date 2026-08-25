// plugins/movie.js - KIRA X MD (TMDB Movie Search without Watermark)
const axios = require('axios');
const https = require('https');

// കണക്ഷൻ സ്റ്റേബിൾ ആക്കാനുള്ള കോൺഫിഗറേഷൻ
const api = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
});

const TMDB_API_KEY = '23a935477fba7e0af118d31923dab5d0';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// ─── Utility Functions ───
async function searchMovies(query) {
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
    const response = await api.get(url);
    return response.data.results || [];
}

async function getMovieDetails(movieId) {
    const url = `${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,similar,videos`;
    const response = await api.get(url);
    return response.data;
}

// ─── Format Function ───
function formatMovieDetails(d) {
    const title = d.title || 'Unknown';
    const year = d.release_date ? d.release_date.split('-')[0] : 'N/A';
    const rating = d.vote_average ? d.vote_average.toFixed(1) : 'N/A';
    const runtime = d.runtime ? `${d.runtime} min` : 'N/A';
    const genres = d.genres ? d.genres.map(g => g.name).join(', ') : 'N/A';
    const overview = d.overview || 'No description available.';
    const poster = d.poster_path ? `${IMAGE_BASE}${d.poster_path}` : null;
    
    // എറർ വരാതിരിക്കാൻ സുരക്ഷിതമായ ചെക്കിങ് (Optional Chaining)
    const director = d.credits?.crew?.find(c => c.job === "Director")?.name || "N/A";
    const cast = d.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || "N/A";
    const trailerData = d.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailer = trailerData ? `https://youtube.com/watch?v=${trailerData.key}` : null;
    const similarMovies = d.similar?.results?.slice(0, 5).map(m => m.title).join(', ') || "None";

    return { title, year, rating, runtime, genres, overview, poster, director, cast, trailer, similarMovies };
}

// ─── Main Plugin ───
module.exports = {
    name: 'movie',
    alias: ['movies', 'film'],
    category: 'search',
    description: 'Search movies (TMDB) – details, cast, trailer, similar',
    usage: '.movie <title>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(jid, { text: "⚠️ *Usage:* .movie <movie name>\n*Example:* .movie Titanic" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            // സിനിമ തിരയുന്നു
            const results = await searchMovies(query);
            
            if (!results || results.length === 0) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { text: `❌ No movies found for "${query}"` }, { quoted: msg });
            }

            // ലിസ്റ്റിലെ ആദ്യത്തെ സിനിമ എടുക്കുന്നു
            const firstMovie = results[0];
            const details = await getMovieDetails(firstMovie.id);
            const formatted = formatMovieDetails(details);
            
            const caption = `🎬 *${formatted.title}* (${formatted.year})\n\n` +
                `⭐ *IMDb:* ${formatted.rating}/10\n` +
                `🎭 *Genre:* ${formatted.genres}\n` +
                `⏱ *Runtime:* ${formatted.runtime}\n` +
                `🎬 *Director:* ${formatted.director}\n\n` +
                `📝 *Story:*\n${formatted.overview.substring(0, 300)}...\n\n` +
                `👥 *Cast:* ${formatted.cast}\n\n` +
                (formatted.trailer ? `🎥 *Trailer:* ${formatted.trailer}\n\n` : '') +
                `🍿 *Similar:* ${formatted.similarMovies}`;

            if (formatted.poster) {
                await sock.sendMessage(jid, { image: { url: formatted.poster }, caption: caption }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
            }
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Movie plugin error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Failed to fetch movie details. Please try again later.` }, { quoted: msg });
        }
    }
};

