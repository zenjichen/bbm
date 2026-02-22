import { Suspense } from 'react';
import MusicApp from '@/components/MusicApp';

export default function Home() {
    return (
        <Suspense fallback={
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{
                    display: 'inline-block',
                    width: 40, height: 40, borderRadius: '50%',
                    border: '3px solid var(--accent)',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                }} />
            </div>
        }>
            <MusicApp />
        </Suspense>
    );
}
