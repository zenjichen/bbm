import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'music.db');
const db = new Database(dbPath);

// Initialize DB schema
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
        topic_id INTEGER, -- message_thread_id
        topic_name TEXT, -- Optional if we can infer or store
        message_id INTEGER,
        chat_id INTEGER,
        date INTEGER
    );
`);

export default db;

export interface Track {
    id: number;
    file_id: string;
    file_unique_id: string;
    title: string | null;
    performer: string | null;
    duration: number;
    topic_id: number | null;
    message_id?: number;
    chat_id?: number;
}
