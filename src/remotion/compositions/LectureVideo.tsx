import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

interface Slide {
  imagePath: string;
  duration: number;
  title?: string;
}

export interface LectureVideoProps {
  slides: Slide[];
  audioPath?: string;
  title?: string;
  fps: number;
  width: number;
  height: number;
}

const SlideWithKenBurns: React.FC<{ imagePath: string; durationInFrames: number; effect: string }> = ({ imagePath, durationInFrames, effect }) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  let scale = 1, translateX = 0;

  switch (effect) {
    case 'zoomIn': scale = interpolate(progress, [0, 1], [1, 1.15]); break;
    case 'zoomOut': scale = interpolate(progress, [0, 1], [1.15, 1]); break;
    case 'panLeft': scale = 1.1; translateX = interpolate(progress, [0, 1], [5, -5]); break;
    case 'panRight': scale = 1.1; translateX = interpolate(progress, [0, 1], [-5, 5]); break;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={imagePath} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${translateX}%, 0)` }} />
    </AbsoluteFill>
  );
};

export const LectureVideo: React.FC<LectureVideoProps> = ({ slides, audioPath, title, fps }) => {
  const { durationInFrames } = useVideoConfig();
  const effects = ['zoomIn', 'panRight', 'zoomOut', 'panLeft'];
  const totalDur = slides.reduce((s, sl) => s + sl.duration, 0);
  const scale = durationInFrames / (totalDur * fps || 1);
  let cur = 0;

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {slides.map((slide, i) => {
        const dur = Math.round(slide.duration * fps * scale);
        const from = cur;
        cur += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SlideWithKenBurns imagePath={slide.imagePath} durationInFrames={dur} effect={effects[i % effects.length]} />
          </Sequence>
        );
      })}
      {title && slides.length === 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 64, fontFamily: 'Arial', textAlign: 'center', padding: 40 }}>{title}</h1>
        </AbsoluteFill>
      )}
      {audioPath && <Audio src={audioPath} />}
    </AbsoluteFill>
  );
};

export default LectureVideo;
