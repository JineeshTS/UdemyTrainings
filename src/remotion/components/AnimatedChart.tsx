import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface AnimatedChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({ data, maxValue }) => {
  const frame = useCurrentFrame();
  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 30, height: 400, padding: '0 60px' }}>
      {data.map((item, i) => {
        const delay = i * 8;
        const height = interpolate(frame - delay, [0, 30], [0, (item.value / max) * 350], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 60, height, backgroundColor: i % 2 === 0 ? '#f4a261' : '#1a1a2e', borderRadius: '8px 8px 0 0', transition: 'height 0.3s' }} />
            <span style={{ marginTop: 8, fontSize: 16, color: '#666', fontFamily: 'Arial' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};
