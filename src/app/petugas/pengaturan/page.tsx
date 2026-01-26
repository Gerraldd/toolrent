'use client'

import { SettingsContent } from '@/components/settings/settings-content'

export default function PengaturanPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                <SettingsContent />
            </div>
        </div>
    )
}
