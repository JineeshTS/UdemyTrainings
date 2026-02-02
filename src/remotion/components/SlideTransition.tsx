import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface SlideTransitionProps {
  children: React.ReactNode;
  durationInFrames: number;
  type?: 'fade' | 'slide' | 'zoom';
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children, durationInFrames, type = 'fade'
}) => {
  const frame = useCurrentFrame();
  const fadeFrames = 15;

  let style: React.CSSProperties = {};

  switch (type) {
    case 'fade':
      style.opacity = interpolate(frame, [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    case 'slide':
      const x = interpolate(frame, [0, fadeFrames], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      style.transform = `translateX(${x}%)`;
      style.opacity = interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    case 'zoom':
      const scale = interpolate(frame, [0, fadeFrames], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      style.transform = `scale(${scale})`;
      style.opacity = interpolate(frame, [0, fadeFrames / 2, durationInFrames - fadeFrames, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};
