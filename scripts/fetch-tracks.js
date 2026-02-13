/**
 * Fetch all audio tracks from a Telegram channel/supergroup with topics (forum).
 * 
 * Auto-detects Channel ID if bot is admin.
 * WAITS for user to add bot if not found.
 * 
 * Usage: node scripts/fetch-tracks.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
require('dotenv').config({ path: envPath });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

if (!BOT_TOKEN) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN in .env.local');
    process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const dataDir = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const tracksPath = path.resolve(dataDir, 'tracks.json');
const topicsPath = path.resolve(dataDir, 'topics.json');

// HTTP request helper
function apiCall(method, params = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}/${method}`);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
        });

        https.get(url.toString(), { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            // console.error(`API Error: ${err.message}`);
            resolve(null);
        });
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Helper to update .env.local
function updateEnvFile(key, value) {
    try {
        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf8');
        }

        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`);
        } else {
            content += `\n${key}=${value}`;
        }

        fs.writeFileSync(envPath, content);
        console.log(`📝 Updated .env.local: ${key}=${value}`);
    } catch (e) {
        console.error('Failed to update .env.local:', e);
    }
}

async function waitForChannelId() {
    console.log('🔍 Waiting for you to add Bot to Channel (and post a message)...');

    let offset = 0;
    while (true) {
        const updates = await apiCall('getUpdates', { offset, timeout: 10 });

        if (updates && updates.ok && updates.result) {
            for (const update of updates.result) {
                offset = update.update_id + 1;

                const chat = update.channel_post?.chat || update.message?.chat || update.my_chat_member?.chat;

                if (chat && (chat.type === 'channel' || chat.type === 'supergroup')) {
                    console.log(`\n✅ DETECTED CHANNEL: "${chat.title}" (ID: ${chat.id})`);
                    return chat.id;
                }
            }
        }
        await sleep(2000);
        process.stdout.write('.');
    }
}

// Load existing data
let existingTracks = [];
const existingTopics = {};

if (fs.existsSync(tracksPath)) {
    try { existingTracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8')); } catch (e) { existingTracks = []; }
}
if (fs.existsSync(topicsPath)) {
    try {
        const arr = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
        arr.forEach(t => existingTopics[t.id] = t.name);
    } catch (e) { }
}

const existingFileIds = new Set(existingTracks.map(t => t.file_unique_id));

// ==================== MAIN ====================
async function main() {
    console.log('🎶 ═══════════════════════════════════════');
    console.log('   Telegram Music Scanner v2.2 (Auto-Wait)');
    console.log('═══════════════════════════════════════════\n');

    // Test bot connection
    const me = await apiCall('getMe');
    if (!me || !me.ok) {
        console.log('❌ Failed to connect to Bot. Check Token.');
        process.exit(1);
    }
    console.log(`🤖 Bot: @${me.result.username}`);

    // Verify Channel ID
    let chatInfo = null;
    if (CHANNEL_ID) {
        process.stdout.write(`📡 Checking configured ID ${CHANNEL_ID}... `);
        chatInfo = await apiCall('getChat', { chat_id: CHANNEL_ID });
        if (chatInfo && chatInfo.ok) {
            console.log('✅ OK');
        } else {
            console.log('❌ Invalid.');
        }
    }

    if (!chatInfo || !chatInfo.ok) {
        console.log('\n⚠️  Bot needs to be an Admin in your Channel.');
        console.log('👉 Please add @blackboxmusic_bot as Administrator to your channel now.');
        console.log('👉 Then post a message/forward a song to the channel.');

        CHANNEL_ID = await waitForChannelId();
        updateEnvFile('TELEGRAM_CHANNEL_ID', CHANNEL_ID);
    }

    // Now scan
    console.log(`\n📥 Scanning channel history...`);

    // Scan logic simplified for speed
    // We assume message IDs are roughly sequential.
    // We'll scan the last 1000 messages first, then expand if needed?
    // Or just start from 1.
    // Let's scan from 1 for thoroughness but with parallel batches.

    let scanned = 0;
    let found = 0;
    let maxId = 2000; // Start assumption

    // Find approximate max ID
    // Check 1000, 2000, 4000...

    async function checkExists(id) {
        const res = await apiCall('forwardMessage', {
            chat_id: CHANNEL_ID,
            from_chat_id: CHANNEL_ID,
            message_id: id,
            disable_notification: true
        });
        if (res && res.ok) {
            const mId = res.result.message_id; // id of copy
            await apiCall('deleteMessage', { chat_id: CHANNEL_ID, message_id: mId });
            return true;
        }
        return false;
    }

    let probe = 100;
    while (await checkExists(probe)) {
        probe *= 2;
        process.stdout.write(`\r   Probing size: ${probe}...`);
    }
    maxId = probe;
    console.log(`\n   Estimated User/Message Range: 1-${maxId}`);

    // Scan messages
    const tracksBuffer = [];
    const BATCH_SIZE = 20; // Parallel requests

    for (let i = 1; i < maxId; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
            if (i + j >= maxId) break;
            batch.push(i + j);
        }

        const promises = batch.map(id => apiCall('forwardMessage', {
            chat_id: CHANNEL_ID,
            from_chat_id: CHANNEL_ID,
            message_id: id,
            disable_notification: true
        }).then(res => ({ id, res })));

        const results = await Promise.all(promises);

        for (const { id, res } of results) {
            if (res && res.ok) {
                const msg = res.result;
                const copyId = msg.message_id;

                // Delete copy immediately
                apiCall('deleteMessage', { chat_id: CHANNEL_ID, message_id: copyId }); // async cleanup

                if (msg.audio) {
                    const audio = msg.audio;
                    if (!existingFileIds.has(audio.file_unique_id)) {
                        tracksBuffer.push({
                            id: existingTracks.length + tracksBuffer.length + 1,
                            file_id: audio.file_id,
                            file_unique_id: audio.file_unique_id,
                            title: audio.title || audio.file_name || 'Unknown Title',
                            performer: audio.performer || 'Unknown Artist',
                            duration: audio.duration,
                            file_size: audio.file_size,
                            mime_type: audio.mime_type,
                            // Simplistic topic detection not reliable here
                            topic_id: null,
                            message_id: id,
                            chat_id: CHANNEL_ID,
                            date: msg.date
                        });
                        existingFileIds.add(audio.file_unique_id);
                        found++;
                    }
                }
            }
        }

        scanned += batch.length;
        process.stdout.write(`\r   Scanned: ${scanned}/${maxId} | Found: ${found} new tracks`);

        if (tracksBuffer.length > 50) {
            // Flush to disk
            existingTracks.push(...tracksBuffer);
            tracksBuffer.length = 0;
            fs.writeFileSync(tracksPath, JSON.stringify(existingTracks, null, 2));
        }
    }

    // Final save
    if (tracksBuffer.length > 0) {
        existingTracks.push(...tracksBuffer);
        fs.writeFileSync(tracksPath, JSON.stringify(existingTracks, null, 2));
    }

    console.log(`\n\n✅ Done! Total tracks: ${existingTracks.length}`);
}

main();
