'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/contexts/language-context'

interface ProvidersProps {
    children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <LanguageProvider>
                    {children}
                    <Toaster position="top-right" richColors />
                </LanguageProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
