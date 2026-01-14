'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface LanguageContextType {
    language: 'en' | 'ar';
    setLanguage: (lang: 'en' | 'ar') => void;
    translations: Record<string, string>;
    t: (key: string) => string;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

interface LanguageProviderProps {
    tenantId: string;
    children: React.ReactNode;
}

export function LanguageProvider({ tenantId, children }: LanguageProviderProps) {
    const [language, setLanguageState] = useState<'en' | 'ar'>('en');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        // Load saved language preference
        const saved = localStorage.getItem('apex_language') as 'en' | 'ar';
        if (saved) {
            setLanguageState(saved);
        }
    }, []);

    useEffect(() => {
        // Fetch translations when language changes
        const fetchTranslations = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/shop/${tenantId}/i18n/translations?lang=${language}`
                );
                const data = await res.json();
                if (data.success) {
                    setTranslations(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch translations:', error);
            }
        };

        fetchTranslations();
    }, [tenantId, language]);

    useEffect(() => {
        // Set document direction for RTL
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: 'en' | 'ar') => {
        setLanguageState(lang);
        localStorage.setItem('apex_language', lang);
    };

    const t = (key: string): string => {
        return translations[key] || key;
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage,
                translations,
                t,
                isRTL: language === 'ar',
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export default function LanguageSwitcher() {
    const { language, setLanguage, isRTL } = useLanguage();

    return (
        <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${language === 'en'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-white/20'
                    }`}
            >
                EN
            </button>
            <button
                onClick={() => setLanguage('ar')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${language === 'ar'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-white/20'
                    }`}
            >
                عربي
            </button>
        </div>
    );
}
