import React from 'react';
import {
  AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig,
  interpolate, spring, staticFile
} from 'remotion';
import { AnimatedBullets } from '../components/AnimatedBullets';
import { TypedCode } from '../components/TypedCode';
import { StepDiagram } from '../components/StepDiagram';
import { SlideTransition } from '../components/SlideTransition';
import { ProgressBar } from '../components/ProgressBar';
import { CourseHeader } from '../components/CourseHeader';

interface SlideData {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes?: string;
  visualType: 'title' | 'bullets' | 'code' | 'diagram' | 'comparison' | 'quote' | 'image';
}

interface CourseSlidesProps {
  slideData: SlideData[];
  audioPath?: string;
  courseTitle?: string;
  sectionTitle?: string;
  fps: number;
  width: number;
  height: number;
}

const TitleSlide: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 200 } }) * 0 + interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ color: 'white', fontSize: 64, fontFamily: 'Arial', textAlign: 'center', padding: '0 80px', opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>{title}</h1>
      {subtitle && <p style={{ color: '#AAAAAA', fontSize: 32, fontFamily: 'Arial', textAlign: 'center', marginTop: 20, opacity: subOpacity }}>{subtitle}</p>}
    </AbsoluteFill>
  );
};

const BulletSlide: React.FC<{ title: string; bullets: string[] }> = ({ title, bullets }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      <div style={{ padding: '100px 0 0 0' }}>
        <h2 style={{ color: '#1a1a2e', fontSize: 44, fontFamily: 'Arial', padding: '0 80px', marginBottom: 40, opacity: titleOpacity, fontWeight: 'bold' }}>{title}</h2>
        <AnimatedBullets bullets={bullets} />
      </div>
    </AbsoluteFill>
  );
};

const CodeSlide: React.FC<{ title: string; code: string }> = ({ title, code }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1e1e1e' }}>
      <h2 style={{ color: 'white', fontSize: 36, fontFamily: 'Arial', padding: '40px 60px 20px', opacity: titleOpacity, fontWeight: 'bold' }}>{title}</h2>
      <TypedCode code={code} />
    </AbsoluteFill>
  );
};

const DiagramSlide: React.FC<{ title: string; steps: string[] }> = ({ title, steps }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F5F5' }}>
      <h2 style={{ color: '#1a1a2e', fontSize: 40, fontFamily: 'Arial', padding: '60px 60px 30px', opacity: titleOpacity, fontWeight: 'bold', textAlign: 'center' }}>{title}</h2>
      <StepDiagram steps={steps} />
    </AbsoluteFill>
  );
};

const QuoteSlide: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 25], [0.9, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)', justifyContent: 'center', alignItems: 'center' }}>
      <p style={{ color: 'white', fontSize: 48, fontFamily: 'Georgia, serif', textAlign: 'center', padding: '0 100px', fontStyle: 'italic', opacity, transform: `scale(${scale})`, lineHeight: 1.5 }}>"{text}"</p>
    </AbsoluteFill>
  );
};

const ComparisonSlide: React.FC<{ title: string; items: string[] }> = ({ title, items }) => {
  const frame = useCurrentFrame();
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      <h2 style={{ color: '#1a1a2e', fontSize: 40, fontFamily: 'Arial', padding: '60px 60px 20px', fontWeight: 'bold', textAlign: 'center' }}>{title}</h2>
      <div style={{ display: 'flex', padding: '0 60px', gap: 40 }}>
        <div style={{ flex: 1 }}>
          <AnimatedBullets bullets={left} color="#1a1a2e" fontSize={28} />
        </div>
        <div style={{ width: 2, backgroundColor: '#ddd' }} />
        <div style={{ flex: 1 }}>
          <AnimatedBullets bullets={right} color="#666666" fontSize={28} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CourseSlides: React.FC<CourseSlidesProps> = ({
  slideData, audioPath, courseTitle, sectionTitle, fps
}) => {
  const { durationInFrames } = useVideoConfig();

  const slideDurationFrames = slideData.length > 0
    ? Math.floor(durationInFrames / slideData.length)
    : durationInFrames;

  const transitions: Array<'fade' | 'slide' | 'zoom'> = ['fade', 'slide', 'zoom'];
  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {slideData.map((slide, i) => {
        const from = currentFrame;
        const dur = i === slideData.length - 1
          ? durationInFrames - currentFrame
          : slideDurationFrames;
        currentFrame += dur;

        const transition = transitions[i % transitions.length];

        let SlideComponent: React.ReactNode;
        const content = slide.content || [];

        switch (slide.visualType) {
          case 'title':
            SlideComponent = <TitleSlide title={slide.title} subtitle={content[0]} />;
            break;
          case 'code':
            SlideComponent = <CodeSlide title={slide.title} code={content.join('\n')} />;
            break;
          case 'diagram':
            SlideComponent = <DiagramSlide title={slide.title} steps={content} />;
            break;
          case 'quote':
            SlideComponent = <QuoteSlide text={content.join(' ')} />;
            break;
          case 'comparison':
            SlideComponent = <ComparisonSlide title={slide.title} items={content} />;
            break;
          default:
            SlideComponent = <BulletSlide title={slide.title} bullets={content} />;
        }

        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SlideTransition durationInFrames={dur} type={transition}>
              {SlideComponent}
            </SlideTransition>
          </Sequence>
        );
      })}

      {courseTitle && <CourseHeader title={courseTitle} sectionTitle={sectionTitle} />}
      <ProgressBar />

      {audioPath && <Audio src={audioPath} />}
    </AbsoluteFill>
  );
};

export default CourseSlides;
