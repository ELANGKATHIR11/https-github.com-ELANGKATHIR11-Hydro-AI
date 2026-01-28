import React, { useEffect, useState } from 'react';
import { fetchModelMetrics, retrainModel } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Brain, RefreshCw, Activity, Layers, CheckCircle } from 'lucide-react';

const MLControlPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [latestIoU, setLatestIoU] = useState(0);

  const loadMetrics = async () => {
    const data = await fetchModelMetrics();
    if (data.history) {
        setMetrics(data.history);
        if (data.history.length > 0) {
            setLatestIoU(data.history[data.history.length - 1].iou);
        }
    }
  };

  useEffect(() => {
    loadMetrics();
    // Poll for metrics if training
    const interval = setInterval(() => {
        loadMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRetrain = async () => {
    setIsTraining(true);
    const success = await retrainModel();
    if (success) {
        // Optimistic UI update
        setTimeout(() => setIsTraining(false), 10000); // Reset button after 10s (approx training time)
    } else {
        setIsTraining(false);
        alert("Failed to trigger training.");
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl stat-card print-hidden flex flex-col gap-4">
       <div className="flex items-center justify-between">
         <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Brain size={16} className="text-pink-500"/>
            Neural Network Status
         </h3>
         <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Architecture: U-Net (ResNet34 Backbone)</span>
         </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
           {/* Metric Card */}
           <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                 <Activity size={14} className="text-emerald-400" />
                 <span className="text-xs text-slate-400 font-medium">Model Accuracy (IoU)</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                  {(latestIoU * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">Intersection over Union</div>
           </div>

           {/* Retrain Button */}
           <div className="flex flex-col justify-center">
              <button 
                onClick={handleRetrain}
                disabled={isTraining}
                className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isTraining ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20'}`}
              >
                 {isTraining ? <RefreshCw className="animate-spin" size={14} /> : <Layers size={14} />}
                 {isTraining ? "Retraining U-Net..." : "Retrain on New Data"}
              </button>
           </div>
       </div>

       {/* Training Chart */}
       <div className="h-32 w-full bg-slate-950/30 rounded-lg border border-slate-800/50 p-2 relative">
          <div className="absolute inset-2">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="epoch" hide />
                    <YAxis domain={[0, 1]} hide />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}}
                        itemStyle={{color: '#fff'}}
                        labelStyle={{display: 'none'}}
                    />
                    <Line type="monotone" dataKey="iou" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="loss" stroke="#f472b6" strokeWidth={2} dot={false} />
                </LineChart>
             </ResponsiveContainer>
          </div>
          <div className="absolute bottom-1 left-2 right-2 flex justify-between">
             <span className="text-[9px] text-emerald-500 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Accuracy</span>
             <span className="text-[9px] text-pink-500 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div> Loss</span>
          </div>
       </div>
    </div>
  );
};

export default MLControlPanel;
