import React from 'react';

interface CourseHeaderProps {
  title: string;
  sectionTitle?: string;
}

export const CourseHeader: React.FC<CourseHeaderProps> = ({ title, sectionTitle }) => {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      background: 'linear-gradient(180deg, rgba(26,26,46,0.9) 0%, transparent 100%)',
      padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <span style={{ color: 'white', fontSize: 18, fontFamily: 'Arial', fontWeight: 'bold' }}>{title}</span>
      {sectionTitle && <span style={{ color: '#f4a261', fontSize: 16, fontFamily: 'Arial' }}>{sectionTitle}</span>}
    </div>
  );
};
