import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data?: { value: number }[];
  color?: string;
}

const defaultData = [
  { value: 10 }, { value: 25 }, { value: 15 }, { value: 35 }, 
  { value: 30 }, { value: 45 }, { value: 40 }, { value: 60 }
];

export const MiniSparkline: React.FC<MiniSparklineProps> = ({ 
  data = defaultData, 
  color = "#3b82f6" 
}) => {
  return (
    <div className="w-full h-12 opacity-50">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
