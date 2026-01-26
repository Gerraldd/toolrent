'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    description?: string
    breadcrumbs?: BreadcrumbItem[]
    actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
    return (
        <div className="mb-6">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mb-2 flex items-center gap-1 text-sm text-gray-500">
                    <Link href="/" className="flex items-center hover:text-gray-700">
                        <Home className="h-4 w-4" />
                    </Link>
                    {breadcrumbs.map((item, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <ChevronRight className="h-4 w-4" />
                            {item.href ? (
                                <Link href={item.href} className="hover:text-gray-700 hover:underline">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-gray-700">{item.label}</span>
                            )}
                        </div>
                    ))}
                </nav>
            )}

            {/* Title and Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {description && (
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}
