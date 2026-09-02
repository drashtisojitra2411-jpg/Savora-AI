import { motion } from 'framer-motion';

export default function ConfidenceIndicator({ confidence, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (confidence / 100) * circumference;
  const remaining = circumference - progress;

  // Dark aesthetic colors
  const color = confidence >= 80 ? '#00c6ff' : confidence >= 50 ? '#ff7a18' : '#f43f5e';
  const label = confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        
        {/* Background glow */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-20" 
          style={{ background: color }} 
        />
        
        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          <defs>
             <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor={color} />
               <stop offset="100%" stopColor={confidence >= 80 ? '#0072ff' : confidence >= 50 ? '#af002d' : '#881337'} />
             </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={8}
          />

          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#grad-${color})`}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: remaining }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
        >
          <span className="font-[Poppins] font-bold text-white leading-none" style={{ fontSize: size * 0.24 }}>
            {confidence}<span className="text-white/50 text-sm">%</span>
          </span>
        </motion.div>
      </div>

      <div
        className="px-4 py-1.5 rounded-full border"
        style={{
          background: `${color}15`,
          borderColor: `${color}30`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color,
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}
      >
        {label} Confidence
      </div>
    </div>
  );
}
