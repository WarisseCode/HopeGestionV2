// src/components/dashboard/DashboardSkeleton.tsx
// Composant skeleton spécifique pour les dashboards
import React from 'react';
import SkeletonLoader, { SkeletonKPI } from '../ui/SkeletonLoader';

interface DashboardSkeletonProps {
  type?: 'gestionnaire' | 'proprietaire' | 'locataire';
}

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ type = 'gestionnaire' }) => {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <SkeletonLoader variant="text" width={300} height={36} />
          <SkeletonLoader variant="text" width={250} height={20} />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonLoader variant="rectangular" width={200} height={40} className="rounded-full" />
          <SkeletonLoader variant="rectangular" width={120} height={40} className="rounded-full" />
        </div>
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonKPI key={i} />
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Charts */}
        <div className="xl:col-span-2 space-y-8">
          {/* Chart Card Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2">
                <SkeletonLoader variant="text" width={200} height={24} />
                <SkeletonLoader variant="text" width={150} height={16} />
              </div>
              <SkeletonLoader variant="rectangular" width={120} height={32} className="rounded-full" />
            </div>
            <SkeletonLoader variant="rectangular" height={350} className="rounded-xl" />
          </div>

          {/* Properties Grid Skeleton */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <SkeletonLoader variant="text" width={180} height={24} />
              <SkeletonLoader variant="text" width={80} height={24} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4">
                  <SkeletonLoader variant="rectangular" width={96} height={96} className="rounded-xl" />
                  <div className="flex-1 space-y-2 py-1">
                    <SkeletonLoader variant="text" width="80%" height={20} />
                    <SkeletonLoader variant="text" width="60%" height={16} />
                    <div className="flex justify-between pt-2">
                      <SkeletonLoader variant="text" width={60} height={24} />
                      <SkeletonLoader variant="text" width={60} height={24} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-8">
          {/* Quick Actions Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <SkeletonLoader variant="text" width={120} height={20} className="mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonLoader key={i} variant="rectangular" height={60} className="rounded-xl" />
              ))}
            </div>
          </div>

          {/* Pie Chart Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <SkeletonLoader variant="text" width={100} height={20} className="mb-4" />
            <div className="h-[200px] flex items-center justify-center">
              <SkeletonLoader variant="circular" width={160} height={160} />
            </div>
          </div>

          {/* Activity Feed Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <SkeletonLoader variant="text" width={120} height={20} className="mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <SkeletonLoader variant="circular" width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <SkeletonLoader variant="text" width="70%" height={16} />
                    <SkeletonLoader variant="text" width="50%" height={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export aussi le skeleton de chart seul pour lazy loading partiel
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 350 }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div className="space-y-2">
        <SkeletonLoader variant="text" width={200} height={24} />
        <SkeletonLoader variant="text" width={150} height={16} />
      </div>
      <SkeletonLoader variant="rectangular" width={120} height={32} className="rounded-full" />
    </div>
    <SkeletonLoader variant="rectangular" height={height} className="rounded-xl" />
  </div>
);

// Export skeleton pour KPI grid
export const KPIGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonKPI key={i} />
    ))}
  </div>
);

export default DashboardSkeleton;
