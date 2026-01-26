import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 p-8 text-center',
                className
            )}
        >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Icon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
            )}
            {action && (
                <Button onClick={action.onClick} className="mt-4">
                    {action.label}
                </Button>
            )}
        </div>
    )
}
