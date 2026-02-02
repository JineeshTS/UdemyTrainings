import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface StepDiagramProps {
  steps: string[];
}

export const StepDiagram: React.FC<StepDiagramProps> = ({ steps }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px', flexWrap: 'wrap' }}>
      {steps.map((step, i) => {
        const delay = i * 20;
        const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const scale = interpolate(frame - delay, [0, 15], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        return (
          <React.Fragment key={i}>
            <div style={{
              opacity, transform: `scale(${scale})`,
              backgroundColor: '#1a1a2e', color: 'white', borderRadius: 12,
              padding: '16px 24px', fontSize: 20, fontFamily: 'Arial',
              textAlign: 'center', minWidth: 120, maxWidth: 200
            }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f4a261', marginBottom: 4 }}>{i + 1}</div>
              {step}
            </div>
            {i < steps.length - 1 && (
              <div style={{ opacity, color: '#f4a261', fontSize: 32, margin: '0 8px' }}>→</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
