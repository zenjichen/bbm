const https = require('https');
const BOT_TOKEN = '8364686578:AAGcSbQwdzl1LrVsP5g_TQVoiMM7y7DaAHk';

function apiCall(method, params = {}) {
    return new Promise((resolve) => {
        const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

async function main() {
    console.log('🐞 DEBUG MODE - Dò tìm ID Group/Topic...');
    console.log('👉 Hãy chat "test" hoặc gửi 1 tin nhắn vào nhóm của bạn ngay bây giờ!');

    let offset = 0;
    while (true) {
        const res = await apiCall('getUpdates', { offset, timeout: 30, allowed_updates: JSON.stringify(['message', 'channel_post', 'my_chat_member']) });

        if (res && res.ok && res.result.length > 0) {
            for (const update of res.result) {
                offset = update.update_id + 1;
                console.log('\n🔵 NHẬN ĐƯỢC UPDATE MỚI:');

                // Inspect Message
                if (update.message) {
                    const chat = update.message.chat;
                    const topicId = update.message.message_thread_id;

                    console.log(`✅ CHAT FOUND:`);
                    console.log(`   ID: ${chat.id}`);
                    console.log(`   Title: ${chat.title}`);
                    console.log(`   Type: ${chat.type}`);
                    console.log(`   Is Forum: ${chat.is_forum}`);

                    if (topicId) {
                        console.log(`   Topic ID (Thread): ${topicId}`);
                        console.log(`   Topic Name: ${update.message.reply_to_message?.forum_topic_created?.name || 'Unknown'}`);
                    }
                }

                // Inspect My Chat Member (Bot status change)
                if (update.my_chat_member) {
                    const chat = update.my_chat_member.chat;
                    console.log(`✅ GROUP EVENT:`);
                    console.log(`   ID: ${chat.id}`);
                    console.log(`   Title: ${chat.title}`);
                }
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();
