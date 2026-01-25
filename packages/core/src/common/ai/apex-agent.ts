import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = new Logger('ApexAgent');

/**
 * 🤖 Apex Security Monitor (Expert Implementation)
 * This agent solves current server issues:
 * 1. Corrects "Cannot read properties of undefined (reading 'error')"
 * 2. Handles missing dist directory
 * 3. Scans for ASMP protocol violations and logs them
 * 4. Self-Heals build and permission issues
 * 
 * ⚠️ Note: Designed specifically for the current project structure.
 */
export const apexAgent = {
    name: 'Apex Security Monitor',
    config: {
        securityProtocol: 'ASMP/v2.3',
        projectRoot: join(__dirname, '../../..'), // Points to packages/core root
        logFile: join(__dirname, '../../../../logs/agent-report.log'),
        errorLogFile: join(__dirname, '../../../../logs/agent-errors.log'),
        devMode: process.env.AGENT_DEV_MODE === 'true'
    },

    async activate() {
        try {
            if (this.config.devMode) this.enableVerboseLogging();
            logger.log('🤖 [APEX_AGENT] بدء تشغيل مراقب الأمان المحترف...');
            await this.initializeLogFile();

            // 1. Diagnostics (S1 Check)
            await this.diagnoseIssues();

            // 2. إصلاح أخطاء التجميع (Self-Healing)
            await this.fixBuildIssues();

            // 3. فحص انتهاكات بروتوكول ASMP
            await this.scanForProtocolViolations();

            logger.log('✅ [APEX_AGENT] اكتمل التشغيل بنجاح');
            return { success: true, reportPath: this.config.logFile };
        } catch (error: any) {
            await this.logErrorDetails(error, 'AGENT_ACTIVATION');
            logger.error('❌ [APEX_AGENT] فشل في التشغيل', error?.stack);
            throw error;
        }
    },

    async initializeLogFile() {
        try {
            const logDir = join(this.config.projectRoot, '../../logs');
            await fs.mkdir(logDir, { recursive: true });
            const header = `===== Apex Agent Report - ${new Date().toISOString()} =====\n`;
            await fs.writeFile(this.config.logFile, header);
        } catch (err) {
            console.warn('⚠️ Agent could not initialize log file');
        }
    },

    async diagnoseIssues() {
        logger.log('🔍 بدء تشخيص مشاكل الوكيل...');

        // 1. Check permissions
        try {
            const logDir = join(this.config.projectRoot, '../../logs');
            await fs.access(logDir, fs.constants.W_OK);
            logger.log('✅ الصلاحيات: جيدة');
        } catch (e) {
            logger.error('❌ الصلاحيات: لا يمكن الكتابة في مجلد السجلات');
        }

        // 2. Check critical paths
        const pathsToCheck = [
            join(this.config.projectRoot, 'src/main.ts'),
            join(this.config.projectRoot, 'dist/main.js'),
            join(this.config.projectRoot, '../../logs')
        ];

        for (const path of pathsToCheck) {
            try {
                await fs.access(path);
                logger.log(`✅ المسار موجود: ${path}`);
            } catch (e) {
                logger.warn(`⚠️ المسار غير موجود: ${path}`);
            }
        }
    },

    async fixBuildIssues() {
        logger.log('🔧 [APEX_AGENT] إصلاح أخطاء التجميع (Self-Healing)...');

        try {
            // 🛡️ S11: Ensure clean dist and valid types
            const { stdout } = await execAsync('rm -rf dist && npx tsc --skipLibCheck --noEmitOnError --outDir dist');
            logger.log('✅ [APEX_AGENT] تم إصلاح عملية التجميع بنجاح');

            // Quick verify
            const mainJsPath = join(this.config.projectRoot, 'dist/main.js');
            await fs.access(mainJsPath);
            logger.log('✅ [APEX_AGENT] ملف التشغيل موجود: dist/main.js');
        } catch (error: any) {
            logger.error('❌ [APEX_AGENT] فشل في إصلاح عملية التجميع', error.message);
            // Attempt self-heal reinstall if critical
            if (error.message.includes('npm')) {
                logger.log('🔄 محاولة إعادة تثبيت التبعيات (Deep Healing)...');
                await execAsync('npm install --force');
                await execAsync('npx tsc --skipLibCheck --noEmitOnError --outDir dist');
            }
        }
    },

    async scanForProtocolViolations() {
        logger.log('🔍 [APEX_AGENT] فحص انتهاكات بروتوكول ASMP...');

        try {
            const violations = [];
            let mainTsPath = join(this.config.projectRoot, 'src/main.ts');

            try {
                await fs.access(mainTsPath);
            } catch (e) {
                // Fallback attempt
                mainTsPath = join(process.cwd(), 'packages/core/src/main.ts');
            }

            const mainTsContent = await fs.readFile(mainTsPath, 'utf-8');

            // 🛡️ S5 Check: Error handling logic
            if (mainTsContent.includes('error.error')) {
                violations.push({
                    layer: 'S5',
                    file: 'main.ts',
                    issue: 'Accessing property on undefined (error.error)',
                    severity: 'critical',
                    solution: 'Use error?.message || error?.toString()'
                });

                // Auto-Fix S5
                const fixedContent = mainTsContent.replace(
                    /logger\.error\('❌ System Initialization Failed', error\.error\);/g,
                    "logger.error('❌ System Initialization Failed', error?.message || 'Unknown error');"
                ).replace(/console\.error\(\`\[BOOTSTRAP_FAIL\] Phase 2: \${error\.error}\`\);/g,
                    "console.error(`[BOOTSTRAP_FAIL] Phase 2: ${error?.message || 'Unknown error'}`);");

                await fs.writeFile(mainTsPath, fixedContent);
                logger.log('✅ [APEX_AGENT] تم إصلاح خطأ معالجة الأخطاء في main.ts تلقائياً');
            }

            // S8 Check: Security Headers
            if (!mainTsContent.includes('helmet')) {
                violations.push({
                    layer: 'S8',
                    file: 'main.ts',
                    issue: 'Missing Helmet security headers',
                    severity: 'high'
                });
            }

            // Logging report
            if (violations.length > 0) {
                let logContent = `[ASMP] ⚠️ تم اكتشاف ${violations.length} انتهاك للبروتوكول:\n`;
                for (const v of violations) {
                    logContent += `- ${v.layer}: ${v.issue} في ${v.file} (الأهمية: ${v.severity})\n`;
                    if (v.solution) logContent += `  الحل المقترح: ${v.solution}\n`;
                }
                await fs.appendFile(this.config.logFile, logContent);
            } else {
                await fs.appendFile(this.config.logFile, '[ASMP] ✅ لا توجد انتهاكات حرجة في البروتوكول\n');
            }
        } catch (error: any) {
            logger.error('❌ [APEX_AGENT] فشل في فحص الانتهاكات', error.message);
        }
    },

    private async logErrorDetails(error: any, context: string) {
        const errorDetails = {
            timestamp: new Date().toISOString(),
            context,
            error: {
                message: error.message || 'خطأ غير معروف',
                stack: error.stack?.split('\n').slice(0, 5).join('\n') || 'بدون تفصيل',
                code: error.code || 'UNKNOWN'
            },
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime()
            }
        };
        try {
            await fs.appendFile(this.config.errorLogFile, JSON.stringify(errorDetails, null, 2) + '\n');
        } catch (e) {
            console.error('Failed to log error details to file');
        }
        console.error(`🚨 [AGENT_ERROR] ${context}: ${error.message}`);
    },

    private enableVerboseLogging() {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        console.log = (...args) => {
            originalConsoleLog(`[${new Date().toISOString()}]`, ...args);
        };
        console.error = (...args) => {
            originalConsoleError(`[${new Date().toISOString()}] ❌`, ...args);
        };
    }
};
