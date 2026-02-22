"use client";

import { useSearchParams } from "next/navigation";

interface Topic { id: string | number; name: string; trackCount?: number; }

const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#7c3aed)',
    'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#ec4899,#be185d)',
    'linear-gradient(135deg,#0ea5e9,#0284c7)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f97316,#ea580c)',
    'linear-gradient(135deg,#a78bfa,#7c3aed)',
];

const EMOJIS = ['🎵', '🎸', '🎹', '🎧', '🎤', '🎺', '🎻', '🥁'];

export default function TopicGrid({ topics }: { topics: Topic[] }) {
    const searchParams = useSearchParams();
    const currentTopic = searchParams.get('topic');

    if (topics.length === 0) return null;

    return (
        <div className="topic-tabs-wrap">
            <div className="topic-tabs">
                {/* All tracks tab */}
                <a
                    href="/"
                    className={`topic-tab ${!currentTopic ? 'topic-tab-active' : ''}`}
                    id="tab-all"
                >
                    <span className="tab-emoji">🎶</span>
                    <span className="tab-name">Tất cả</span>
                    <span className="tab-count">{topics.reduce((s, t) => s + (t.trackCount ?? 0), 0)}</span>
                </a>

                {topics.map((topic, i) => {
                    const active = currentTopic === String(topic.id);
                    return (
                        <a
                            key={topic.id}
                            href={`/?topic=${topic.id}`}
                            className={`topic-tab ${active ? 'topic-tab-active' : ''}`}
                            id={`tab-${topic.id}`}
                            style={{ '--tab-grad': GRADIENTS[i % GRADIENTS.length] } as React.CSSProperties}
                        >
                            <span className="tab-emoji">{EMOJIS[i % EMOJIS.length]}</span>
                            <span className="tab-name">{topic.name}</span>
                            {topic.trackCount !== undefined && (
                                <span className="tab-count">{topic.trackCount}</span>
                            )}
                        </a>
                    );
                })}
            </div>
            <div className="topic-tabs-fade-r" />
        </div>
    );
}
