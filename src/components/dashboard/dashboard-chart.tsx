'use client'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
    ScriptableContext,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useTheme } from 'next-themes'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
)

interface DashboardChartProps {
    data: Array<{
        label: string
        count: number
    }>
    className?: string
}

export function DashboardChart({ data, className }: DashboardChartProps) {

    // If no data, provide empty structure to avoid errors
    const chartLabels = data.length > 0 ? data.map((d) => d.label) : []
    const chartValues = data.length > 0 ? data.map((d) => d.count) : []

    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    // Colors
    const textColor = isDark ? '#94a3b8' : '#64748b' // slate-400 : slate-500
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
    const tooltipBg = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' // slate-800 : white
    const tooltipText = isDark ? '#f8fafc' : '#1e293b' // slate-50 : slate-800
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0' // slate-700 : slate-200

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                fill: true,
                label: 'Peminjaman',
                data: chartValues,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: (context: ScriptableContext<'line'>) => {
                    const ctx = context.chart.ctx
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)')
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)')
                    return gradient
                },
                tension: 0.4,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: tooltipBg,
                titleColor: tooltipText,
                bodyColor: tooltipText,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: 10,
                boxPadding: 4,
                displayColors: false,
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: function (context: any) {
                        return `Total: ${context.parsed.y}`
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                border: {
                    display: false,
                },
                grid: {
                    color: gridColor,
                },
                ticks: {
                    stepSize: 1,
                    color: textColor,
                },
            },
            x: {
                border: {
                    display: false,
                },
                grid: {
                    display: false,
                },
                ticks: {
                    color: textColor,
                },
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    }

    if (data.length === 0) {
        return (
            <div className="flex h-[240px] w-full items-center justify-center text-gray-400">
                <p>Belum ada data peminjaman</p>
            </div>
        )
    }

    return (
        <div className={`h-[240px] w-full ${className || ''}`}>
            <Line options={options} data={chartData} />
        </div>
    )
}
