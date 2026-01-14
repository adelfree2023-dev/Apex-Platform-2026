'use client';

import { useState, useEffect } from 'react';

interface FlashSaleTimerProps {
    endDate: Date;
    title?: string;
    onExpire?: () => void;
}

export default function FlashSaleTimer({ endDate, title = "Flash Sale Ends In", onExpire }: FlashSaleTimerProps) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setIsExpired(true);
                onExpire?.();
                return;
            }

            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            });
        };

        // Calculate immediately
        calculateTimeLeft();

        // Update every second
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [endDate, onExpire]);

    // Auto-hide when expired
    if (isExpired) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-6 text-white shadow-2xl">
            {/* Title */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl animate-pulse">⚡</span>
                <h2 className="text-xl font-bold uppercase tracking-wider">{title}</h2>
                <span className="text-2xl animate-pulse">⚡</span>
            </div>

            {/* Timer */}
            <div className="flex justify-center gap-4">
                <TimeBlock value={timeLeft.days} label="Days" />
                <Separator />
                <TimeBlock value={timeLeft.hours} label="Hours" />
                <Separator />
                <TimeBlock value={timeLeft.minutes} label="Mins" />
                <Separator />
                <TimeBlock value={timeLeft.seconds} label="Secs" />
            </div>
        </div>
    );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
    return (
        <div className="text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[70px]">
                <span className="text-3xl font-bold tabular-nums">
                    {value.toString().padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs uppercase tracking-wider mt-1 block opacity-80">
                {label}
            </span>
        </div>
    );
}

function Separator() {
    return (
        <div className="flex items-center text-2xl font-bold opacity-60">:</div>
    );
}
