import { useEffect, useState, useRef } from 'react';

interface SemicircleGaugeProps {
  percentage: number;
  color: string;
  label: string;
  svgWidth?: number;
}

export function SemicircleGauge({ percentage, color, label, svgWidth = 150 }: SemicircleGaugeProps) {
  const [animatedOffset, setAnimatedOffset] = useState(188.5);
  const [displayPct, setDisplayPct] = useState(0);
  const mounted = useRef(false);

  const scale = svgWidth / 150;
  const height = Math.round(80 * scale);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const timer = setTimeout(() => {
      const target = 188.5 * (1 - percentage / 100);
      setAnimatedOffset(target);

      // Counter animation
      const duration = 1400;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayPct(Math.round(eased * percentage));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="relative flex flex-col items-center" style={{ width: svgWidth, height: height + 8 }}>
      <svg width={svgWidth} height={height} viewBox="0 0 150 80">
        {/* Track */}
        <path
          d="M 15 75 A 60 60 0 0 1 135 75"
          fill="none"
          stroke="#e2e8ed"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 15 75 A 60 60 0 0 1 135 75"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray="188.5"
          strokeDashoffset={animatedOffset}
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
        <span style={{ fontSize: 24 * scale, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
          {displayPct}%
        </span>
        <span style={{ fontSize: 9 * scale, color: '#94a3b8', marginTop: 1 }}>{label}</span>
      </div>
    </div>
  );
}
