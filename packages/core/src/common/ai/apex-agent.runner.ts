import { apexAgent } from './apex-agent';

async function runAgent() {
    console.log('🚀 تشغيل Apex Agent خارج سياق التطبيق...');
    const result = await apexAgent.activate();
    console.log('✅ نتائج الفحص:', result);
    process.exit(0);
}

runAgent().catch(err => {
    console.error('❌ خطأ في تشغيل Apex Agent:', err);
    process.exit(1);
});
