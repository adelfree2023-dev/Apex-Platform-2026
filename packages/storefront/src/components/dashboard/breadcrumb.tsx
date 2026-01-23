import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 space-x-reverse">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                        {item.href ? (
                            <Link href={item.href as any} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
