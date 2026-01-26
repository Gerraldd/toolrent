import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
    title: string
    value: string | number
    description?: string
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
    iconClassName?: string
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className,
    iconClassName,
}: StatCardProps) {
    return (
        <Card className={cn('', className)}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-gray-900">{value}</p>
                            {trend && (
                                <span
                                    className={cn(
                                        'text-sm font-medium',
                                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                                    )}
                                >
                                    {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-gray-500">{description}</p>
                        )}
                    </div>
                    <div
                        className={cn(
                            'rounded-lg p-3',
                            iconClassName || 'bg-blue-100'
                        )}
                    >
                        <Icon className={cn('h-6 w-6', iconClassName ? '' : 'text-blue-600')} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
