module.exports = [
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BillingPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-ssr] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-ssr] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-ssr] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/file-text.js [app-ssr] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/download.js [app-ssr] (ecmascript) <export default as Download>");
'use client';
;
;
const recentInvoices = [
    {
        id: 'INV-001',
        tenant: 'TechStore Pro',
        amount: 199,
        status: 'paid',
        date: '2026-01-15'
    },
    {
        id: 'INV-002',
        tenant: 'Fashion Hub',
        amount: 79,
        status: 'paid',
        date: '2026-01-14'
    },
    {
        id: 'INV-003',
        tenant: 'Mobile Mart',
        amount: 199,
        status: 'paid',
        date: '2026-01-13'
    },
    {
        id: 'INV-004',
        tenant: 'Quick Shop',
        amount: 29,
        status: 'failed',
        date: '2026-01-12'
    },
    {
        id: 'INV-005',
        tenant: 'Home Essentials',
        amount: 79,
        status: 'pending',
        date: '2026-01-11'
    }
];
function BillingPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6 animate-fade-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-2xl font-bold text-white",
                                children: "Billing & Revenue"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 18,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: "Financial overview and invoices"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 19,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 17,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 22,
                                columnNumber: 21
                            }, this),
                            "Export Report"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 21,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                lineNumber: 16,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-4 gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"], {
                                className: "h-8 w-8 text-emerald-400 mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 29,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-3xl font-bold text-white",
                                children: "$48,250"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 30,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: "Monthly Revenue (MRR)"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 31,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 28,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                className: "h-8 w-8 text-blue-400 mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 34,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-3xl font-bold text-white",
                                children: "$579,000"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 35,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: "Annual Revenue (ARR)"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 36,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 33,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"], {
                                className: "h-8 w-8 text-purple-400 mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 39,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-3xl font-bold text-white",
                                children: "247"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 40,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: "Active Subscriptions"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 41,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 38,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                className: "h-8 w-8 text-amber-400 mb-3"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 44,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-3xl font-bold text-white",
                                children: "$195"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 45,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-400",
                                children: "Avg. Revenue Per User"
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 46,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 43,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                lineNumber: 27,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl bg-white/5 border border-white/10 p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold text-white mb-4",
                        children: "Recent Invoices"
                    }, void 0, false, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 51,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                        className: "w-full",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "border-b border-white/10",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase",
                                            children: "Invoice"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                            lineNumber: 55,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase",
                                            children: "Tenant"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                            lineNumber: 56,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase",
                                            children: "Amount"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                            lineNumber: 57,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase",
                                            children: "Status"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                            lineNumber: 58,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase",
                                            children: "Date"
                                        }, void 0, false, {
                                            fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                            lineNumber: 59,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                    lineNumber: 54,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 53,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: recentInvoices.map((inv)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "border-b border-white/5 hover:bg-white/5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-4 text-sm font-medium text-indigo-400",
                                                children: inv.id
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                lineNumber: 65,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-4 text-sm text-white",
                                                children: inv.tenant
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                lineNumber: 66,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-4 text-sm text-white font-medium",
                                                children: [
                                                    "$",
                                                    inv.amount
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                lineNumber: 67,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-4",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `px-2 py-1 rounded-full text-xs font-medium ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : inv.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`,
                                                    children: inv.status
                                                }, void 0, false, {
                                                    fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                    lineNumber: 69,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                lineNumber: 68,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-4 py-4 text-sm text-gray-400",
                                                children: inv.date
                                            }, void 0, false, {
                                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                                lineNumber: 76,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, inv.id, true, {
                                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                        lineNumber: 64,
                                        columnNumber: 29
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                                lineNumber: 62,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                        lineNumber: 52,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
                lineNumber: 50,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/src/app/(dashboard)/dashboard/billing/page.tsx",
        lineNumber: 15,
        columnNumber: 9
    }, this);
}
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>DollarSign
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-ssr] (ecmascript)");
;
const __iconNode = [
    [
        "line",
        {
            x1: "12",
            x2: "12",
            y1: "2",
            y2: "22",
            key: "7eqyqh"
        }
    ],
    [
        "path",
        {
            d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
            key: "1b0p4s"
        }
    ]
];
const DollarSign = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("dollar-sign", __iconNode);
;
 //# sourceMappingURL=dollar-sign.js.map
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-ssr] (ecmascript) <export default as DollarSign>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DollarSign",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-ssr] (ecmascript)");
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>TrendingUp
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-ssr] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M16 7h6v6",
            key: "box55l"
        }
    ],
    [
        "path",
        {
            d: "m22 7-8.5 8.5-5-5L2 17",
            key: "1t1m79"
        }
    ]
];
const TrendingUp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("trending-up", __iconNode);
;
 //# sourceMappingURL=trending-up.js.map
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-ssr] (ecmascript) <export default as TrendingUp>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrendingUp",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-ssr] (ecmascript)");
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/download.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Download
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-ssr] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M12 15V3",
            key: "m9g1x1"
        }
    ],
    [
        "path",
        {
            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
            key: "ih7n3h"
        }
    ],
    [
        "path",
        {
            d: "m7 10 5 5 5-5",
            key: "brsn70"
        }
    ]
];
const Download = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])("download", __iconNode);
;
 //# sourceMappingURL=download.js.map
}),
"[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/download.js [app-ssr] (ecmascript) <export default as Download>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Download",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$Apex$2d$Platform$2d$2026$2f$apex$2d$frontend$2f$apps$2f$hq$2d$admin$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/Apex-Platform-2026/apex-frontend/apps/hq-admin/node_modules/lucide-react/dist/esm/icons/download.js [app-ssr] (ecmascript)");
}),
];

//# sourceMappingURL=Desktop_Apex-Platform-2026_apex-frontend_apps_hq-admin_2579ad20._.js.map