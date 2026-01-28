import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { SeasonalData } from '../types';

interface VolumeChartProps {
  data: SeasonalData[];
  forecast?: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isForecast = payload[0].payload.isForecast;
    return (
      <div className="bg-slate-800 border border-slate-600 p-3 rounded shadow-lg text-sm print-hidden z-50">
        <p className={`font-bold ${isForecast ? 'text-emerald-400' : 'text-slate-200'}`}>
            {label} {isForecast ? '(AI Forecast)' : ''}
        </p>
        <p className="text-sky-400">Volume: {payload[0].value} MCM</p>
        {!isForecast && <p className="text-indigo-400">Rainfall: {payload[1].value} mm</p>}
      </div>
    );
  }
  return null;
};

const VolumeChart: React.FC<VolumeChartProps> = ({ data, forecast }) => {
  // Format data for chart
  const chartData = data.map(d => ({
    name: `${d.season.substring(0,3)} '${d.year.toString().slice(2)}`,
    Volume: d.volume,
    Rainfall: d.rainfall,
    isForecast: false
  }));

  // Append Forecast Data if available
  if (forecast !== null && forecast !== undefined) {
      chartData.push({
          name: 'Next Season',
          Volume: Math.round(forecast),
          Rainfall: 0, // Placeholder
          isForecast: true
      });
  }

  return (
    <div className="w-full h-64 bg-slate-900/50 rounded-xl p-4 border border-slate-800 chart-print-container flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-sm font-semibold text-slate-400">Historical Storage & LSTM Forecast</h3>
          {forecast && (
              <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span> Observed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-200 border-dashed"></span> Prediction</span>
              </div>
          )}
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
              <pattern id="patternForecast" patternUnits="userSpaceOnUse" width="4" height="4">
                  <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#34d399" strokeWidth="1" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickMargin={10} />
            <YAxis stroke="#94a3b8" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            
            <Area 
                type="monotone" 
                dataKey="Volume" 
                stroke="#38bdf8" 
                fillOpacity={1} 
                fill="url(#colorVol)" 
                strokeWidth={2}
                isAnimationActive={true}
            />
            
            {/* Split visualization for Forecast isn't trivial with single Area, 
                so we rely on the tooltip and potentially a different style for the last segment if needed.
                For now, simpler is better: the last point just continues the line.
            */}
            
            <ReferenceLine x={chartData.length - 2} stroke="#64748b" strokeDasharray="3 3">
                <Label value="Today" position="insideTopLeft" fill="#94a3b8" fontSize={10} />
            </ReferenceLine>

          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;
