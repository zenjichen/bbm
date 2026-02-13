# Streamify - Personal Telegram Music Streamer

A personal music streaming website that plays audio files directly from your Telegram Channel.

## Features
- **Stream**: Play music directly from Telegram without downloading.
- **Search**: Fast search by song title or artist.
- **Topics as Playlists**: Each Forum Topic in your channel is treated as a separate playlist.
- **Responsive**: Works on Mobile and Desktop.

## Setup

### 1. Prerequisites
- **Node.js** (v18 or later) must be installed.
- **Telegram Bot Token** (You provided: `8364686578:AAGcSbQwdzl1LrVsP5g_TQVoiMM7y7DaAHk`)
- **Channel ID** (You provided: `1003640001216`)

### 2. Install Dependencies
Open a terminal in this folder and run:
```bash
npm install
```

### 3. Database Initialization
The database will be automatically created when you start the bot or the app.

## Running the App

You need to run **two processes** simultaneously:

### Process 1: The Web Server
Runs the website interface.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the site.

### Process 2: The Telegram Indexer
Listens for new music and indexes it into the database.
```bash
node scripts/bot.js
```

## How to Add Music
1. **New Uploads**: Just upload audio files to your Telegram Channel. The bot will automatically detect and list them on the site.
2. **Existing Music**: If you already have music in the channel, **Forward** those messages to your Bot (in a private chat with the bot). The bot script will pick them up and add them to the database.
3. **Playlists**: Create a new **Topic** in your Telegram Group/Channel and upload/forward music there. The website will group them automatically.

## Updates
If you change the code, restart `npm run dev`.

## Troubleshooting
- If `npm install` fails, make sure you have Node.js installed.
- If images or audio don't load, check your internet connection.
