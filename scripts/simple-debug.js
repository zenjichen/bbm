const https = require('https');
const BOT_TOKEN = '8364686578:AAGcSbQwdzl1LrVsP5g_TQVoiMM7y7DaAHk';

function main() {
    console.log('🐞 Simple Debugger Started...');
    // Poll updates without filters
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=0&timeout=30`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(data); // Print raw JSON
        });
    });
}

main();
