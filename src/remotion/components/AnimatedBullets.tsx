import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface AnimatedBulletsProps {
  bullets: string[];
  color?: string;
  fontSize?: number;
}

export const AnimatedBullets: React.FC<AnimatedBulletsProps> = ({
  bullets,
  color = '#333333',
  fontSize = 36
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ padding: '0 80px' }}>
      {bullets.map((bullet, i) => {
        const delay = i * 15;
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const translateX = spring({ frame: frame - delay, fps, config: { damping: 200 } }) * 0 + interpolate(frame - delay, [0, 10], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        return (
          <div key={i} style={{ opacity, transform: `translateX(${translateX}px)`, marginBottom: 20, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#f4a261', fontSize: fontSize + 4, marginRight: 16, lineHeight: 1 }}>•</span>
            <span style={{ color, fontSize, fontFamily: 'Arial, sans-serif', lineHeight: 1.4 }}>{bullet}</span>
          </div>
        );
      })}
    </div>
  );
};
