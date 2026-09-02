import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const MACRO_COLORS = {
  Protein: ['#8b5cf6', '#6366f1'],
  Carbs: ['#ff8a1c', '#ff4d7e'],
  Fats: ['#22d3ee', '#0ea5e9'],
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    const color = payload[0].payload?.fill || payload[0].color || '#fff';
    
    return (
      <div className="glass-card" style={{ padding: '12px 20px', minWidth: 140, border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-[Poppins] font-semibold text-[#a9afc3] text-xs uppercase tracking-wider mb-1">
          {name}
        </p>
        <div className="flex items-baseline gap-1">
           <p className="font-[Poppins] font-bold text-2xl text-white">
             {value}
           </p>
           <span className="text-white/50 text-sm font-medium">g</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MacroPieChart({ protein, carbs, fats }) {
  const data = [
    { name: 'Protein', value: protein },
    { name: 'Carbs', value: carbs },
    { name: 'Fats', value: fats },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={MACRO_COLORS[entry.name][0]} />
                <stop offset="100%" stopColor={MACRO_COLORS[entry.name][1]} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={70}
            paddingAngle={4}
            dataKey="value"
            labelLine={false}
            stroke="none"
            animationBegin={200}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={`url(#pieGrad-${index})`}
                style={{ filter: `drop-shadow(0 4px 12px ${MACRO_COLORS[entry.name][0]}60)` }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Legend
            verticalAlign="bottom"
            height={26}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#a9afc3', fontWeight: 500, fontFamily: 'Inter', fontSize: '0.85rem' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function MacroBarChart({ protein, carbs, fats }) {
  const data = [
    { name: 'Protein', value: protein, colorId: 0 },
    { name: 'Carbs', value: carbs, colorId: 1 },
    { name: 'Fats', value: fats, colorId: 2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} barSize={28} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradTop-0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MACRO_COLORS.Protein[0]} />
              <stop offset="100%" stopColor={MACRO_COLORS.Protein[1]} />
            </linearGradient>
            <linearGradient id="barGradTop-1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MACRO_COLORS.Carbs[0]} />
              <stop offset="100%" stopColor={MACRO_COLORS.Carbs[1]} />
            </linearGradient>
            <linearGradient id="barGradTop-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MACRO_COLORS.Fats[0]} />
              <stop offset="100%" stopColor={MACRO_COLORS.Fats[1]} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: '#a9afc3', fontSize: 13, fontWeight: 500, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: '#69718c', fontSize: 12, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={index} 
                fill={`url(#barGradTop-${entry.colorId})`} 
                style={{ filter: 'brightness(1.1)' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
