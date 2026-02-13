import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(process.cwd(), 'data/tracks.json');

export interface Track {
    id: number;
    file_id: string;
    file_unique_id: string;
    title: string | null;
    performer: string | null;
    duration: number;
    file_size: number;
    mime_type: string;
    topic_id: number | null;
    message_id?: number;
    chat_id?: number;
    date: number;
}

// Function to read tracks
export function getTracks(query?: string, topicId?: number, limit = 50): Track[] {
    try {
        if (!fs.existsSync(dataPath)) return [];

        const raw = fs.readFileSync(dataPath, 'utf8');
        let tracks: Track[] = JSON.parse(raw);

        // Sort by date desc
        tracks.sort((a, b) => b.date - a.date);

        if (topicId) {
            tracks = tracks.filter(t => t.topic_id === topicId);
        }

        if (query) {
            const q = query.toLowerCase();
            tracks = tracks.filter(t =>
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.performer && t.performer.toLowerCase().includes(q))
            );
        }

        return tracks.slice(0, limit);
    } catch (error) {
        console.error("Error reading tracks.json", error);
        return [];
    }
}

// Function to get distinct topics
export function getTopics(): { id: number, name: string }[] {
    try {
        if (!fs.existsSync(dataPath)) return [];
        const raw = fs.readFileSync(dataPath, 'utf8');
        const tracks: Track[] = JSON.parse(raw);

        const topicsMap = new Map<number, string>();
        tracks.forEach(t => {
            if (t.topic_id) {
                topicsMap.set(t.topic_id, t.topic_id.toString()); // Could store name if available
            }
        });

        return Array.from(topicsMap.entries()).map(([id, name]) => ({ id, name: `Topic ${id}` }));
    } catch (error) {
        return [];
    }
}
