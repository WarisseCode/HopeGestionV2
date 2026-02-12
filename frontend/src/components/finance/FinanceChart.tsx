// frontend/src/components/finance/FinanceChart.tsx
// Graphique Revenus vs Dépenses (recharts)

import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line,
    ComposedChart
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
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
            <p className="font-bold text-gray-800 mb-2">{label}</p>
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
        <Card className="border-none shadow-xl bg-white">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                    📊 Évolution Revenus vs Dépenses
                </h3>
                <span className="text-xs text-gray-400">6 derniers mois</span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="label" 
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                            tickFormatter={formatXOF}
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            wrapperStyle={{ fontSize: 13, fontWeight: 600 }}
                        />
                        <Bar 
                            dataKey="revenue" 
                            name="Revenus" 
                            fill="#22c55e" 
                            radius={[6, 6, 0, 0]}
                            barSize={28}
                        />
                        <Bar 
                            dataKey="expenses" 
                            name="Dépenses" 
                            fill="#f97316" 
                            radius={[6, 6, 0, 0]}
                            barSize={28}
                        />
                        <Line 
                            dataKey="net" 
                            name="Trésorerie nette" 
                            stroke="#3b82f6" 
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#3b82f6' }}
                            type="monotone"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default FinanceChart;
