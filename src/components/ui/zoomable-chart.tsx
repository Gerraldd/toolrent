"use client"

import { useState } from "react"
import { Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

interface ZoomableChartProps {
    children: React.ReactNode | ((props: { isExpanded: boolean }) => React.ReactNode)
    title: string
    description?: string
    icon?: React.ReactNode
    modalClassName?: string
}

export function ZoomableChart({ children, title, description, icon, modalClassName }: ZoomableChartProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Handle both render prop and standard children
    const renderContent = (isExpanded: boolean) => {
        if (typeof children === 'function') {
            return children({ isExpanded })
        }
        return children
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                        {description && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => setIsOpen(true)}
                    title="Maximize Chart"
                >
                    <Maximize2 className="h-4 w-4" />
                    <span className="sr-only">Maximize Chart</span>
                </Button>
            </div>

            {/* Original Chart */}
            <div className="flex-1 w-full min-h-0">
                {renderContent(false)}
            </div>

            {/* Modal Chart */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className={`flex flex-col p-6 ${modalClassName || 'max-w-[90vw] h-[80vh]'}`}>
                    <DialogHeader className="flex-none">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                    {icon}
                                </div>
                            )}
                            <div>
                                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                                {description && (
                                    <DialogDescription>{description}</DialogDescription>
                                )}
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 w-full min-h-0 mt-6 relative">
                        {renderContent(true)}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
