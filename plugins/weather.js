module.exports = {
    name: 'weather',
    alias: ['wthr', 'climate'],
    category: 'utility',
    description: 'Get detailed current weather information',
    usage: `${process.env.PREFIX || '.'}weather <city name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `🌤️ *WEATHER REPORT*\n\n❌ *Please enter a city name*\n➤ Example: ${process.env.PREFIX || '.'}weather Kochi` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🌤️", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Analyzing climate in* : ${query}...` });

        try {
            // Geocoding using fetch
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
            const geoData = await geoRes.json();
            
            if (!geoData.results) throw new Error('City not found!');
            
            const { latitude, longitude, name, country, admin1 } = geoData.results[0];

            // Detailed Weather API using fetch
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility`;
            const res = await fetch(weatherUrl);
            const data = await res.json();
            const w = data.current;

            const getWeatherInfo = (code) => {
                const codes = {
                    0: '☀️ Clear sky', 1: '🌤️ Mainly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
                    45: '🌫️ Foggy', 48: '🌫️ Depositing rime fog', 51: '🌦️ Light drizzle',
                    61: '🌧️ Slight rain', 63: '🌧️ Moderate rain', 65: '🌧️ Heavy rain',
                    80: '🌧️ Rain showers', 95: '⛈️ Thunderstorm'
                };
                return codes[code] || '🌡️ Normal';
            };

            const response = `🌍 *WEATHER REPORT* 🌍

📍 *Location* : ${name}, ${admin1 || ''}, ${country}

🌡️ *Condition* : ${getWeatherInfo(w.weather_code)}
🌡️ *Temperature* : ${w.temperature_2m}°C
👤 *Feels Like* : ${w.apparent_temperature}°C
💧 *Humidity* : ${w.relative_humidity_2m}%
🌬️ *Wind Speed* : ${w.wind_speed_10m} km/h
🧭 *Wind Dir* : ${w.wind_direction_10m}°
☁️ *Pressure* : ${w.surface_pressure} hPa
👁️ *Visibility* : ${w.visibility / 1000} km
🌧️ *Precipitation* : ${w.precipitation} mm`;

            await sock.sendMessage(jid, { text: response, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ *Error* : ${err.message}`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};