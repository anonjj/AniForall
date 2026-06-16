export default function AmbientBackground({ color }) {
  const bg = color
    ? `radial-gradient(ellipse 80% 60% at 50% 0%, ${color}40 0%, transparent 70%)`
    : 'none';

  return (
    <div
      aria-hidden="true"
      style={{
        background: bg,
        transition: 'background 800ms ease',
      }}
      className="fixed inset-0 z-[-1] pointer-events-none"
    />
  );
}
