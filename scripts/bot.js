/**
 * Telegram Bot Listener - Listens for new audio messages and adds them to tracks.json
 * 
 * Run this alongside your dev server to auto-index new music posted to your channel/group.
 * Usage: node scripts/bot.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env.local");
    process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const dataDir = path.resolve(process.cwd(), 'data');
const tracksPath = path.resolve(dataDir, 'tracks.json');
const topicsPath = path.resolve(dataDir, 'topics.json');

// Ensure data folder exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data
let tracks = [];
let topics = [];

if (fs.existsSync(tracksPath)) {
    try { tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8')); } catch (e) { tracks = []; }
}
if (fs.existsSync(topicsPath)) {
    try { topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8')); } catch (e) { topics = []; }
}

const existingFileIds = new Set(tracks.map(t => t.file_unique_id));

function apiCall(method, params = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}/${method}`);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
        });

        https.get(url.toString(), { timeout: 30000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

function saveTrack(msg) {
    const audio = msg.audio;
    if (!audio) return;

    if (existingFileIds.has(audio.file_unique_id)) {
        console.log(`  ⏭️ Skipped: "${audio.title || 'No Title'}" (already indexed)`);
        return;
    }

    const topicId = msg.message_thread_id || null;

    const newTrack = {
        id: tracks.length + 1,
        file_id: audio.file_id,
        file_unique_id: audio.file_unique_id,
        title: audio.title || audio.file_name || 'Unknown Title',
        performer: audio.performer || 'Unknown Artist',
        duration: audio.duration || 0,
        file_size: audio.file_size || 0,
        mime_type: audio.mime_type || 'audio/mpeg',
        topic_id: topicId,
        message_id: msg.message_id,
        chat_id: msg.chat.id,
        date: msg.date || Math.floor(Date.now() / 1000),
        thumbnail: audio.thumbnail ? audio.thumbnail.file_id : null
    };

    tracks.push(newTrack);
    existingFileIds.add(audio.file_unique_id);

    console.log(`  🎵 Indexed: "${newTrack.title}" by ${newTrack.performer} (Topic: ${topicId || 'none'})`);

    // Save immediately
    fs.writeFileSync(tracksPath, JSON.stringify(tracks, null, 2));
}

function handleTopicCreated(msg) {
    if (!msg.forum_topic_created) return;

    const threadId = msg.message_thread_id || msg.message_id;
    const name = msg.forum_topic_created.name;

    // Check if topic already exists
    if (!topics.some(t => t.id === threadId)) {
        topics.push({ id: threadId, name });
        fs.writeFileSync(topicsPath, JSON.stringify(topics, null, 2));
        console.log(`  📁 New topic: "${name}" (ID: ${threadId})`);
    }
}

// Long polling implementation
let offset = 0;

async function poll() {
    try {
        const result = await apiCall('getUpdates', {
            offset,
            timeout: 30,
            allowed_updates: JSON.stringify(['message', 'channel_post'])
        });

        if (result && result.ok && result.result.length > 0) {
            for (const update of result.result) {
                offset = update.update_id + 1;

                const msg = update.message || update.channel_post;
                if (!msg) continue;

                // Handle audio messages
                if (msg.audio) {
                    saveTrack(msg);
                }

                // Handle topic creation
                if (msg.forum_topic_created) {
                    handleTopicCreated(msg);
                }
            }
        }
    } catch (err) {
        console.error('Poll error:', err.message);
    }

    // Continue polling
    setTimeout(poll, 500);
}

// Main
async function main() {
    console.log('\n🎶 ═══════════════════════════════════════');
    console.log('   BBM Music Bot Listener');
    console.log('═══════════════════════════════════════════\n');

    const me = await apiCall('getMe');
    if (!me || !me.ok) {
        console.error('❌ Failed to connect. Check BOT_TOKEN.');
        process.exit(1);
    }

    console.log(`🤖 Bot: @${me.result.username}`);
    console.log(`💾 Tracks: ${tracks.length} indexed`);
    console.log(`📁 Topics: ${topics.length}\n`);
    console.log('👂 Listening for new music...\n');

    poll();
}

main();
