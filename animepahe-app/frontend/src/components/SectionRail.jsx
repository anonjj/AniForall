import { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import useReducedMotion from '../hooks/useReducedMotion';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

function ItemWrap({ reducedMotion, children }) {
  if (reducedMotion) {
    return <div style={{ scrollSnapAlign: 'start' }}>{children}</div>;
  }
  return (
    <motion.div variants={itemVariants} style={{ scrollSnapAlign: 'start' }}>
      {children}
    </motion.div>
  );
}

export default function SectionRail({
  title,
  icon: Icon,
  iconColor = 'text-brandPurple',
  children,
  empty,
  action,
}) {
  const scrollRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const items = Array.isArray(children) ? children : children ? [children] : [];

  return (
    <section className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll(-1)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors focus-visible:ring-2 focus-visible:ring-brandPurple outline-none"
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors focus-visible:ring-2 focus-visible:ring-brandPurple outline-none"
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll container */}
      {empty ? (
        <div className="py-4">{empty}</div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {reducedMotion ? (
            <div className="flex gap-3">
              {items.map((child, i) => (
                <div key={i} style={{ scrollSnapAlign: 'start' }}>{child}</div>
              ))}
            </div>
          ) : (
            <motion.div
              className="flex gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {items.map((child, i) => (
                <ItemWrap key={i} reducedMotion={false}>
                  {child}
                </ItemWrap>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
