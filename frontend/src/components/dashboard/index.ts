// frontend/src/components/dashboard/index.ts
export { default as KPICard } from './KPICard';
export { default as QuickActions } from './QuickActions';
export { default as ActivityFeed } from './ActivityFeed';
export type { Activity } from './ActivityFeed';
export { default as UpcomingEvents } from './UpcomingEvents';
export type { UpcomingEvent } from './UpcomingEvents';
export { default as PeriodFilter, getDateRangeFromPeriod } from './PeriodFilter';
export type { Period } from './PeriodFilter';
export { default as DashboardSkeleton, ChartSkeleton, KPIGridSkeleton } from './DashboardSkeleton';
