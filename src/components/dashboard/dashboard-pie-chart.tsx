'use client'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { useTheme } from 'next-themes'

ChartJS.register(ArcElement, Tooltip, Legend)

interface DashboardPieChartProps {
    data: Array<{
        id: number
        name: string
        percentage: number
        color: string
        alatCount: number
    }>
    totalAlat: number
    className?: string
}

export function DashboardPieChart({ data, totalAlat, className }: DashboardPieChartProps) {

    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    const tooltipBg = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'
    const tooltipText = isDark ? '#f8fafc' : '#1e293b'
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0'

    const chartData = {
        labels: data.map((d) => d.name),
        datasets: [
            {
                data: data.map((d) => d.percentage),
                backgroundColor: data.map((d) => d.color),
                borderColor: data.map((d) => d.color),
                borderWidth: 1,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: {
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
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: function (context: any) {
                        return `${context.label}: ${context.parsed}%`
                    },
                },
            },
        },
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 h-40 w-40 rounded-full border-4 border-gray-100 dark:border-gray-800"></div>
                <p className="text-sm text-gray-400">Belum ada data kategori</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full">
            <div className={`relative mb-4 ${className || 'h-40 w-40'}`}>
                <Doughnut data={chartData} options={options} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalAlat}
                        </p>
                        <p className="text-xs text-gray-500">Total</p>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-2">
                {data.map((cat) => (
                    <div
                        key={cat.id}
                        className="flex items-center justify-between text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                            ></div>
                            <span className="text-gray-600 dark:text-gray-300">
                                {cat.name}
                            </span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {cat.percentage}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
