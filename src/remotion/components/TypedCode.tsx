import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface TypedCodeProps {
  code: string;
  fontSize?: number;
}

export const TypedCode: React.FC<TypedCodeProps> = ({ code, fontSize = 24 }) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(interpolate(frame, [0, 90], [0, code.length], { extrapolateRight: 'clamp' }));
  const visible = code.substring(0, chars);

  return (
    <div style={{
      backgroundColor: '#0d0d0d',
      borderRadius: 12,
      padding: 40,
      margin: '0 60px',
      fontFamily: 'Courier New, monospace',
      fontSize,
      color: '#00ff00',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.6
    }}>
      {visible}
      <span style={{ opacity: frame % 30 < 15 ? 1 : 0, color: '#00ff00' }}>▌</span>
    </div>
  );
};
