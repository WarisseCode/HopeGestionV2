// frontend/src/components/finance/FinanceChart.tsx
// Graphique Revenus vs Dépenses (recharts)

import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line
} from 'recharts';
import { financeApi } from '../../api/financeApi';
import Card from '../ui/Card';

interface MonthlyDataPoint {
    label: string;
    month: number;
    year: number;
    revenue: number;
    expenses: number;
    net: number;
}

const formatXOF = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700/50 text-sm">
            <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
                    <span>{entry.name} :</span>
                    <span className="font-mono font-bold">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(entry.value)}
                    </span>
                </p>
            ))}
        </div>
    );
};

const FinanceChart: React.FC = () => {
    const [data, setData] = useState<MonthlyDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChart();
    }, []);

    const loadChart = async () => {
        try {
            setLoading(true);
            const result = await financeApi.getMonthlyStats(6);
            setData(result);
        } catch (error) {
            console.error('Erreur chart:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Chargement du graphique...</div>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="h-80 flex items-center justify-center text-gray-400">
                Aucune donnée disponible pour le graphique
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    📊 Évolution Revenus vs Dépenses
                </h3>
                <span className="text-xs text-gray-400">6 derniers mois</span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis 
                            dataKey="label" 
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            tickFormatter={formatXOF}
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenus" 
                            stroke="#22c55e" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            name="Dépenses" 
                            stroke="#ef4444" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorExpenses)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Line 
                            dataKey="net" 
                            name="Trésorerie nette" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={false}
                            type="monotone" 
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default FinanceChart;
