# BBM Music - Premium Telegram Streamer

A personal music streaming application that plays audio directly from a Telegram channel.

## Features
- 🎵 **Telegram Streaming**: Stream audio directly from your Telegram channel without exposing bot tokens.
- 🎨 **Premium UI**: Modern, glassmorphism design with dark mode.
- 📂 **Topic Support**: Automatically organizes music by Telegram forum topics.
- 📱 **Responsive**: Full mobile support with a persistent player bar.
- 🔎 **Search**: Instant search across your entire music collection.

## Setup

1. Clone the repo.
2. Install dependencies: `npm install`
3. Configure `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHANNEL_ID=your_channel_id
   ```
4. Run the fetch script: `npm run fetch`
5. Start the server: `npm run dev`

## Deployment

Deployed on Vercel.
