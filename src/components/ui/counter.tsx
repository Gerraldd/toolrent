'use client'

import { useEffect, useState, useRef } from 'react'

interface CounterProps {
    value: number
    duration?: number
    className?: string
}

export function Counter({ value, duration = 500, className }: CounterProps) {
    const [count, setCount] = useState(0)
    const countRef = useRef(count)
    const startTimeRef = useRef<number | null>(null)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        // Reset animation when value changes
        startTimeRef.current = null
        const startValue = 0 // Always start from 0 for this specific requirement

        // Easing function (easeOutExpo)
        const easeOutExpo = (t: number): number => {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        }

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp
            const progress = timestamp - startTimeRef.current
            const percentage = Math.min(progress / duration, 1) // Ensure percentage doesn't exceed 1

            const currentCount = Math.floor(
                startValue + (value - startValue) * easeOutExpo(percentage)
            )

            setCount(currentCount)
            countRef.current = currentCount

            if (percentage < 1) {
                rafRef.current = requestAnimationFrame(animate)
            } else {
                setCount(value) // Ensure final value is exact
            }
        }

        rafRef.current = requestAnimationFrame(animate)

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [value, duration])

    return <span className={className}>{count}</span>
}
