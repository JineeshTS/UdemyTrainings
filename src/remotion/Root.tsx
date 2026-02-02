import { Composition } from 'remotion';
import { LectureVideo, LectureVideoProps } from './compositions/LectureVideo';
import { CourseSlides } from './compositions/CourseSlides';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CourseSlides"
        component={CourseSlides}
        durationInFrames={30 * 60 * 10}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          slideData: [],
          audioPath: '',
          courseTitle: 'Course',
          sectionTitle: '',
          fps: 30,
          width: 1920,
          height: 1080
        }}
      />

      <Composition
        id="LectureVideo"
        component={LectureVideo}
        durationInFrames={30 * 60 * 10}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          slides: [],
          audioPath: '',
          title: 'Lecture',
          fps: 30,
          width: 1920,
          height: 1080
        } as LectureVideoProps}
      />
    </>
  );
};

export default RemotionRoot;
