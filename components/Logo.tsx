import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <div className={`${className} relative group select-none`}>
      {/* Outer Glow Effect */}
      <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-lg group-hover:bg-cyan-500/30 transition-all duration-500"></div>
      
      {/* Container */}
      <div className="relative w-full h-full bg-slate-900 border border-slate-700/50 rounded-xl flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm group-hover:border-cyan-500/30 transition-colors">
        
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 drop-shadow-lg">
            <defs>
                <linearGradient id="hydroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan 400 */}
                    <stop offset="100%" stopColor="#6366f1" /> {/* Indigo 500 */}
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Hexagon Background Frame */}
            <path d="M50 5 L89 27.5 V72.5 L50 95 L11 72.5 V27.5 Z" 
                  fill="none" 
                  stroke="url(#hydroGrad)" 
                  strokeWidth="1.5" 
                  strokeOpacity="0.4"
                  strokeDasharray="4 2"
                  className="group-hover:stroke-opacity-100 transition-all duration-700"
            />

            {/* Central Water Drop */}
            <path d="M50 20 C 35 35, 20 50, 20 65 A 30 30 0 0 0 80 65 C 80 50, 65 35, 50 20 Z" 
                  fill="url(#hydroGrad)" 
                  opacity="0.9"
                  filter="url(#glow)"
            />

            {/* AI/Circuit Network Overlay */}
            <path d="M50 35 V 65 M50 65 L 35 75 M50 65 L 65 75" 
                  stroke="white" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  opacity="0.9"
            />
            <circle cx="50" cy="65" r="4" fill="white" />
            <circle cx="35" cy="75" r="3" fill="white" />
            <circle cx="65" cy="75" r="3" fill="white" />
            
            {/* Satellite Orbit Dot */}
            <circle cx="50" cy="12" r="3" fill="#22d3ee">
                <animateTransform 
                    attributeName="transform" 
                    type="rotate" 
                    from="0 50 50" 
                    to="360 50 50" 
                    dur="10s" 
                    repeatCount="indefinite" 
                />
            </circle>
        </svg>
      </div>
    </div>
  );
};

export default Logo;
