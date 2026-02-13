const { Telegraf } = require('telegraf');
const Database = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
// Note: CHANNEL_ID in .env might be -100... or user input. We'll handle both.

if (!BOT_TOKEN) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const dbPath = path.resolve(__dirname, '../music.db');
const db = new Database(dbPath);

// Ensure table exists (duplicate of lib/db.ts logic but safe here)
db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        file_unique_id TEXT NOT NULL UNIQUE,
        title TEXT,
        performer TEXT,
        duration INTEGER,
        file_size INTEGER,
        mime_type TEXT,
        topic_id INTEGER, 
        topic_name TEXT, 
        message_id INTEGER,
        chat_id INTEGER,
        date INTEGER
    );
`);

/**
 * Save audio track to DB
 */
function saveTrack(msg) {
    const audio = msg.audio;
    if (!audio) return;

    // Check if it's from the target channel (optional, but good for filtering)
    // If msg.chat.id is not the CHANNEL_ID, warn?
    // But channels post as 'channel_post' or 'message' depending on context.

    const topicId = msg.message_thread_id || null; // For forum topics

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO tracks (
            file_id, file_unique_id, title, performer, duration, file_size, mime_type, 
            topic_id, message_id, chat_id, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const info = stmt.run(
            audio.file_id,
            audio.file_unique_id,
            audio.title || audio.file_name || 'Unknown Title',
            audio.performer || 'Unknown Artist',
            audio.duration,
            audio.file_size,
            audio.mime_type,
            topicId,
            msg.message_id,
            msg.chat.id,
            msg.date
        );
        if (info.changes > 0) {
            console.log(`[Indexed] ${audio.title} in Topic ${topicId}`);
        } else {
            console.log(`[Skipped] ${audio.title} (Already exists)`);
        }
    } catch (err) {
        console.error("Error saving track:", err);
    }
}

// Handle new channel posts (if bot is admin)
bot.on('channel_post', (ctx) => {
    // console.log("Channel post:", ctx.channelPost);
    if (ctx.channelPost.audio) {
        saveTrack(ctx.channelPost);
    }
});

// Handle messages (e.g. if forwarded to bot or group)
bot.on('message', (ctx) => {
    // console.log("Message:", ctx.message);
    if (ctx.message.audio) {
        saveTrack(ctx.message);
    }
});

// Define a command to manually index a forwarded message?
// Not easily possible to "read" history.
// However, the user can just forward existing songs to this bot.

bot.launch().then(() => {
    console.log('Bot is running and listening for music...');
    console.log('To index existing music, forward the songs to this bot.');
}).catch(err => {
    console.error("Bot launch failed:", err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
