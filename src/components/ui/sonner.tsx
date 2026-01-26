"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps, toast } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={true}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        close: <XIcon className="size-4" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:shadow-lg',
          success: 'group-[.toaster]:bg-green-600 group-[.toaster]:text-white group-[.toaster]:border-green-700',
          error: 'group-[.toaster]:bg-red-600 group-[.toaster]:text-white group-[.toaster]:border-red-700',
          warning: 'group-[.toaster]:bg-yellow-500 group-[.toaster]:text-white group-[.toaster]:border-yellow-600',
          info: 'group-[.toaster]:bg-blue-600 group-[.toaster]:text-white group-[.toaster]:border-blue-700',
          closeButton: 'group-[.toaster]:bg-white/20 group-[.toaster]:border-white/30 group-[.toaster]:text-white hover:group-[.toaster]:bg-white/30',
        },
      }}
      style={
        {
          zIndex: 99999,
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
