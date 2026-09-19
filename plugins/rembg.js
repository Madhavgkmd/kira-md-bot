const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const REMOVE_BG_API_KEY = '8TdrbitPfoV1JEPnKpCrWBhB';
const REQUEST_TIMEOUT = 60000; // 60 Seconds timeout for AI processing
const UPLOAD_TIMEOUT = 30000;
const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getQuotedImage(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    return (
        quoted.imageMessage ||
        quoted.viewOnceMessageV2?.message?.imageMessage ||
        quoted.viewOnceMessage?.message?.imageMessage ||
        quoted.ephemeralMessage?.message?.imageMessage ||
        quoted.viewOnceMessageV2Extension?.message?.imageMessage ||
        null
    );
}

async function downloadImage(imageMessage) {
    try {
        const buffer = await downloadMediaMessage({ message: { imageMessage } }, 'buffer', {}, { logger: console });
        if (!buffer || !buffer.length) throw new Error('Downloaded image is empty');
        return buffer;
    } catch (error) {
        throw new Error(`Image download failed: ${error.message}`);
    }
}

// ============================================================
// UPLOAD LOGIC (Uguu.se Only - 100% Working Direct RAW URL)
// ============================================================
async function uploadToUguu(buffer) {
    const form = new FormData();
    form.append('files[]', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const response = await axios.post('https://uguu.se/upload.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': FAKE_USER_AGENT },
        timeout: UPLOAD_TIMEOUT,
        validateStatus: () => true
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    if (!response.data?.files?.[0]?.url) throw new Error('Invalid Uguu response format');
    return response.data.files[0].url; 
}

async function uploadImage(buffer) {
    try { 
        console.log('[UPLOAD] Uploading to Uguu.se (Direct URL)...'); 
        const url = await uploadToUguu(buffer); 
        console.log('[UPLOAD] Success:', url);
        return url;
    } catch (error) { 
        throw new Error(`Uguu.se upload failed: ${error.message}`); 
    }
}

// ============================================================
// REMBG API
// ============================================================
async function removeBackground(buffer) {
    if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY === 'YOUR_REMOVE_BG_API_KEY') throw new Error('Remove.bg API key is not configured');
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempFile = path.join(tempDir, `rembg_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
    fs.writeFileSync(tempFile, buffer);
    
    try {
        const form = new FormData();
        form.append('image_file', fs.createReadStream(tempFile));
        form.append('size', 'auto');
        
        console.log('[REMBG] Processing image via remove.bg...');
        const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
            headers: { ...form.getHeaders(), 'X-Api-Key': REMOVE_BG_API_KEY, 'User-Agent': FAKE_USER_AGENT },
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT,
            validateStatus: () => true
        });
        
        if (response.status < 200 || response.status >= 300) {
            let apiError = '';
            try { apiError = Buffer.from(response.data).toString('utf8'); } catch (_) {}
            throw new Error(`remove.bg HTTP ${response.status}` + (apiError ? ` - ${apiError}` : ''));
        }
        if (!response.data || !response.data.length) throw new Error('remove.bg returned empty image');
        
        return response.data;
    } finally {
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
    }
}

// ============================================================
// UPSCALE API (JerryCoder with retries)
// ============================================================
async function upscaleJerry(imageUrl, version) {
    const apiUrl = version === 'v2' 
        ? `https://jerrycoder.oggyapi.workers.dev/tool/upscale-v2?image=${encodeURIComponent(imageUrl)}`
        : `https://jerrycoder.oggyapi.workers.dev/tool/upscale-v1?img=${encodeURIComponent(imageUrl)}&json=true`;

    const response = await axios.get(apiUrl, { 
        headers: { 'User-Agent': FAKE_USER_AGENT }, 
        timeout: REQUEST_TIMEOUT, 
        validateStatus: () => true 
    });

    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    
    const data = response.data;
    if (data?.status === 'success') {
        if (version === 'v2' && data.url) return data.url;
        if (version === 'v1' && data.result_url) return data.result_url;
    }
    
    throw new Error(data?.message || data?.error || `Invalid response from V${version}`);
}

async function upscaleImage(imageUrl) {
    const errors = [];
    
    try { 
        console.log('[UPSCALE] Requesting AI Upscale V2 (Takes 10-15s)...');
        return await upscaleJerry(imageUrl, 'v2'); 
    } catch (e) { 
        errors.push(`V2: ${e.message}`); 
    }

    console.log('[UPSCALE] V2 failed. Waiting 4s before trying V1...');
    await delay(4000); 

    try { 
        console.log('[UPSCALE] Requesting AI Upscale V1...');
        return await upscaleJerry(imageUrl, 'v1'); 
    } catch (e) { 
        errors.push(`V1: ${e.message}`); 
    }

    console.log('[UPSCALE] V1 failed. Waiting 5s before final V2 Retry...');
    await delay(5000);

    try { 
        console.log('[UPSCALE] Final Retry V2...');
        return await upscaleJerry(imageUrl, 'v2'); 
    } catch (e) { 
        errors.push(`V2 Retry: ${e.message}`); 
    }

    throw new Error(`All upscale attempts failed.\nLogs:\n${errors.join('\n')}`);
}

function friendlyError(error) {
    const msg = error?.message || 'Unknown error';
    const lower = msg.toLowerCase();
    if (lower.includes('timeout') || lower.includes('timed out')) return '⏱️ Server timed out. The image was too heavy or the AI is busy. Please try again.';
    if (msg.includes('401') || msg.includes('403')) return '🔑 API authentication failed. Please check the API key.';
    if (msg.includes('413') || lower.includes('too large')) return '📦 Image is too large. Please send a smaller image.';
    if (msg.includes('429') || lower.includes('rate limit')) return '🚦 API rate limit reached. Please try again later.';
    return msg;
}

module.exports = [
    {
        name: 'rembg',
        alias: ['removebg', 'bgremove'],
        category: 'media',
        description: 'Remove background using remove.bg API',
        usage: '.rembg (reply to an image)',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const imageMessage = getQuotedImage(msg);
            if (!imageMessage) return await sock.sendMessage(jid, { text: '❌ *Please reply to an image!*\n\nExample: Reply to an image with `.rembg`' }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            try {
                console.log('[REMBG] Starting process...');
                const buffer = await downloadImage(imageMessage);
                const result = await removeBackground(buffer);
                await sock.sendMessage(jid, { image: result, mimetype: 'image/png', caption: '✨ *Background removed successfully!*' }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                console.log('[REMBG] Success.');
            } catch (error) {
                console.error('[PLUGIN ERROR - rembg]', error);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Background removal failed!*\n\n*Error:* \`\`\`${friendlyError(error)}\`\`\`\n\n🔄 Please try again.` }, { quoted: msg });
            }
        }
    },
    {
        name: 'upscale',
        alias: ['hd', 'enhance', '4k'],
        category: 'media',
        description: 'Upscale and enhance image quality',
        usage: '.upscale (reply to an image)',
        async execute(sock, msg, args) {
            const jid = msg.key.remoteJid;
            const imageMessage = getQuotedImage(msg);
            if (!imageMessage) return await sock.sendMessage(jid, { text: '❌ *Please reply to an image!*\n\nExample: Reply to an image with `.upscale`' }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            
            // Send wait message because 15s processing time can feel long
            const waitMsg = await sock.sendMessage(jid, { text: "⏳ _Enhancing image... This may take 10-15 seconds._" }, { quoted: msg });

            try {
                const buffer = await downloadImage(imageMessage);
                const imageUrl = await uploadImage(buffer);
                
                const upscaledUrl = await upscaleImage(imageUrl);
                
                await sock.sendMessage(jid, { image: { url: upscaledUrl }, caption: '✨ *HD Upscaled Successfully!*\n\n_Powered by KIRA X MD_' }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                console.log('[UPSCALE] Success.');
            } catch (error) {
                console.error('[PLUGIN ERROR - upscale]', error.stack || error);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await sock.sendMessage(jid, { text: `❌ *Image upscale failed!*\n\n*Error:* \`\`\`${friendlyError(error)}\`\`\`\n\n🔄 Check panel console for detailed logs.` }, { quoted: msg });
            } finally {
                // Clean up the waiting message
                if (waitMsg) await sock.sendMessage(jid, { delete: waitMsg.key }).catch(()=>{});
            }
        }
    }
];