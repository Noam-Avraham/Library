import { useState } from 'react';

export default function BookCover({ thumbnailUrl, title }) {
  const [err, setErr] = useState(false);
  if (thumbnailUrl && !err) {
    return <img src={thumbnailUrl} alt={title} onError={() => setErr(true)} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#4338ca,#1e3a8a)' }}>
      <span className="text-white font-bold">{title?.[0] || '?'}</span>
    </div>
  );
}
