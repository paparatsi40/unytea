"use client";

import { TrendingUp, Users, Zap, Sparkles, Star, Heart, Flame } from "lucide-react";

interface SpectacularFeedHeaderProps {
  postsCount: number;
}

export function SpectacularFeedHeader({ postsCount }: SpectacularFeedHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-1 shadow-2xl">
      <div className="relative overflow-hidden rounded-[1.8rem] bg-slate-950 p-12">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 animate-pulse" style={{ animationDuration: '3s' }} />
        
        {/* Floating animated shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full blur-3xl animate-float" />
          <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-br from-fuchsia-400 to-pink-600 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-10 left-1/4 w-36 h-36 bg-gradient-to-br from-purple-400 to-violet-600 rounded-full blur-3xl animate-float-slow" />
        </div>

        {/* Animated stars */}
        <div className="absolute top-8 right-12 animate-spin-slow">
          <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
        </div>
        <div className="absolute bottom-12 right-24 animate-pulse">
          <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
        </div>
        <div className="absolute top-16 left-1/3 animate-bounce" style={{ animationDuration: '3s' }}>
          <Flame className="w-7 h-7 text-orange-400 fill-orange-400" />
        </div>

        <div className="relative z-10">
          {/* Epic Title Section */}
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Mega animated icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl blur-2xl animate-pulse opacity-75" />
                <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-5 rounded-3xl shadow-2xl transform hover:scale-110 transition-all duration-300 hover:rotate-6">
                  <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>
              </div>
              
              <div>
                <h1 className="text-6xl font-black bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent mb-2">
                  Community Feed
                </h1>
                <p className="text-xl text-violet-200 font-semibold">
                  ✨ Share, connect, and grow together
                </p>
              </div>
            </div>
          </div>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Posts Card with pulsing animation */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 p-6 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/50">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/10 to-violet-600/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-4xl font-black text-white mb-1 group-hover:scale-110 transition-transform duration-300">
                    {postsCount}
                  </div>
                  <div className="text-base font-bold text-violet-300">Posts</div>
                </div>
              </div>
            </div>

            {/* Active Community Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-500/20 p-6 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/50">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/10 to-emerald-600/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              
              {/* Animated dots representing community */}
              <div className="absolute top-4 right-4 flex gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl lg:text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300 leading-tight">
                    Active
                  </div>
                  <div className="text-base lg:text-lg font-bold text-white leading-tight">Community</div>
                  <div className="text-xs font-semibold text-white/70 mt-1">Growing strong</div>
                </div>
              </div>
            </div>

            {/* Live Engagement Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 p-6 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/50">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-600/10 to-amber-600/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              
              {/* Lightning bolts */}
              <div className="absolute top-4 right-4">
                <Zap className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />
              </div>
              
              <div className="relative flex items-center gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300 animate-pulse flex-shrink-0">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl lg:text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300 leading-tight">
                    Live
                  </div>
                  <div className="text-base lg:text-lg font-bold text-white leading-tight">Engagement</div>
                  <div className="text-xs font-semibold text-white/70 mt-1">Real-time activity</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add custom animations */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-20px) translateX(10px); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-30px) translateX(-15px); }
          }
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-15px) translateX(20px); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float-delayed 7s ease-in-out infinite;
            animation-delay: 1s;
          }
          .animate-float-slow {
            animation: float-slow 8s ease-in-out infinite;
            animation-delay: 2s;
          }
          .animate-spin-slow {
            animation: spin 20s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
