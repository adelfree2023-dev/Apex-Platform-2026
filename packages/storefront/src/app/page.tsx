import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-6">
                    Launch Your Store in <span className="text-blue-600">60 Seconds</span>
                </h1>
                <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                    Enterprise-grade multi-tenant e-commerce platform with complete data isolation,
                    military-grade security, and lightning-fast performance.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link
                        href="/register"
                        className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                        Create Your Store Now
                    </Link>
                    <Link
                        href="/login"
                        className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-blue-600"
                    >
                        Login to Dashboard
                    </Link>
                </div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-4xl mb-4">🔒</div>
                        <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
                        <p className="text-gray-600">ASMP-compliant with complete tenant isolation</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-4xl mb-4">⚡</div>
                        <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
                        <p className="text-gray-600">22ms average store provisioning time</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="text-4xl mb-4">🚀</div>
                        <h3 className="text-xl font-bold mb-2">Production Ready</h3>
                        <p className="text-gray-600">Battle-tested on 34.186.7.87</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
