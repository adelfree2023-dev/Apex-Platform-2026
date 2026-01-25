// agent-cli.ts - واجهة التحكم البسيطة لـ Apex Agent
import { apexAgent } from './src/common/ai/apex-agent';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

async function startInteractiveMode() {
    console.log('\n🤖 مرحبًا بوكيل أمان Apex! أدخل أمرًا:');
    console.log('الأوامر المتاحة:');
    console.log('  scan    - فحص النظام بالكامل وتطوير التقارير');
    console.log('  fix     - إصلاح المشاكل البرمجية والتجميعية (Self-Heal)');
    console.log('  diag    - تشغيل أدوات التشخيص الذكية');
    console.log('  exit    - الخروج من الواجهة\n');

    rl.question('> ', async (command) => {
        try {
            const cmd = command.trim().toLowerCase();
            switch (cmd) {
                case 'scan':
                    console.log('🔍 بدء الفحص الشامل...');
                    await apexAgent.activate();
                    break;
                case 'fix':
                    console.log('🔧 بدء الإصلاح الشامل...');
                    await apexAgent.fixBuildIssues();
                    await apexAgent.scanForProtocolViolations();
                    break;
                case 'diag':
                    console.log('🔍 تشخيص الأنظمة...');
                    await apexAgent.diagnoseIssues();
                    break;
                case 'exit':
                    console.log('👋 مع السلامة! النظام في أمان.');
                    rl.close();
                    process.exit(0);
                    return;
                default:
                    console.log('❓ أمر غير معروف. حاول: scan, fix, diag, exit');
            }
        } catch (error: any) {
            console.error('❌ خطأ أثناء تنفيذ الأمر:', error.message);
        }
        startInteractiveMode();
    });
}

console.log('🚀 تشغيل واجهة التحكم بالوكيل (Apex Agent CLI)...');
startInteractiveMode();
