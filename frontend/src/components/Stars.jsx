export default function Stars({ rating, size = 'sm' }) {
  if (!rating) return null;
  const fontSize = size === 'lg' ? '1.25rem' : '0.875rem';
  return (
    <span dir="ltr" className="inline-flex" style={{ fontSize }}>
      {[1, 2, 3, 4, 5].map(i => {
        const isFull = rating >= i;
        const isHalf = !isFull && rating >= i - 0.5;
        return (
          <span key={i} style={isHalf ? {
            background: 'linear-gradient(to right, #f59e0b 50%, rgba(180,160,100,0.3) 50%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          } : { color: isFull ? '#f59e0b' : 'rgba(180,160,100,0.3)' }}>★</span>
        );
      })}
    </span>
  );
}
