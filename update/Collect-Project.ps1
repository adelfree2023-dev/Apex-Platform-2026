# =============================================================================
#  APEX PROJECT COLLECTOR - ARCHITECT EDITION (STRICT MODE) 🛡️
#  Updates: Ignores raw code in map, only captures comments & decorators.
# =============================================================================

# 1. إعداد المسارات
$CurrentScriptPath = $PSScriptRoot
$ParentProjectDir = Split-Path -Parent $CurrentScriptPath
$OutputFileName = "Apex_2026_Codex.txt"
$OutputFilePath = Join-Path $CurrentScriptPath $OutputFileName
$PackageJsonPath = Join-Path $ParentProjectDir "package.json"

# 2. إعداد الفلاتر (تجاهل المجلدات غير الهامة)
$ExcludedFolders = @("node_modules", ".git", ".idea", "dist", "build", "coverage", "update", ".vscode", "test")
$AllowedExtensions = "\.(ts|js|json|html|css|scss|md|txt|java|py|cs|cpp|h|sql|prisma|ps1|sh|env|yml|yaml)$"

# 3. دالة ذكية ومحددة لاستخراج الوصف (Strict Filter)
function Get-FileDescription {
    param([string]$FilePath)
    try {
        # نقرأ أول 10 أسطر بحثاً عن تعليقات فقط
        $Lines = Get-Content -Path $FilePath -TotalCount 10 -ErrorAction SilentlyContinue
        
        foreach ($Line in $Lines) {
            $l = $Line.Trim()
            if ([string]::IsNullOrWhiteSpace($l)) { continue }

            # تجاهل تام لأسطر الأكواد والاستيرادات (هذا هو التعديل الجوهري)
            if ($l -match "^(import|package|require|const|let|var|export|class|interface|type|async|function|return)") { 
                # إذا وصلنا للكود ولم نجد تعليقاً، نتوقف فوراً ونرجع فارغاً
                if ($l -notmatch "^@") { return "" }
            }

            # 1. التقاط التعليقات الصريحة فقط
            if ($l.StartsWith("//") -or $l.StartsWith("/*") -or $l.StartsWith("*")) {
                $clean = $l -replace "^/{2,}\s*", "" -replace "^\/\*+\s*", "" -replace "^\*\s*", "" -replace "\*\/$", ""
                # تجاهل التعليقات القصيرة جداً أو الآلية
                if ($clean.Length -gt 4 -and $clean -notmatch "^eslint") { 
                    # تقصير النص الطويل
                    if ($clean.Length -gt 50) { $clean = $clean.Substring(0, 47) + "..." }
                    return " ➤ $clean" 
                }
            }
            
            # 2. التعرف الذكي على نوع الملف من الديكورات (NestJS Magic)
            if ($l -match "@Controller") { return " ➤ [API Endpoint]" }
            if ($l -match "@Injectable") { return " ➤ [Service Logic]" }
            if ($l -match "@Module") { return " ➤ [Feature Module]" }
            if ($l -match "@Entity") { return " ➤ [Database Entity]" }
            if ($l -match "#!") { return " ➤ [Shell Script]" }
        }
    } catch {}
    return "" # إرجاع فارغ إذا لم نجد وصفاً مفيداً
}

# 4. تنظيف القديم
if (Test-Path $OutputFilePath) { Remove-Item $OutputFilePath -Force -ErrorAction SilentlyContinue }

# 5. جمع الإحصائيات
Write-Host "📊 Analyzing Codebase Structure..." -ForegroundColor Cyan
$AllFiles = Get-ChildItem -Path $ParentProjectDir -Recurse -File | 
    Where-Object { 
        $RelPath = $_.FullName.Substring($ParentProjectDir.Length)
        -not ($ExcludedFolders | Where-Object { $RelPath -match [regex]::Escape($_) }) -and
        ($_.Extension -match $AllowedExtensions)
    }

$TotalFiles = $AllFiles.Count
$TotalLines = 0
foreach ($File in $AllFiles) {
    try { $Lines = (Get-Content $File.FullName | Measure-Object -Line).Lines; $TotalLines += $Lines } catch {}
}

# 6. فتح ملف الكتابة (StreamWriter)
$Stream = [System.IO.StreamWriter]::new($OutputFilePath, $false, [System.Text.Encoding]::UTF8)

try {
    # --- HEADER ---
    $Stream.WriteLine("==============================================================================")
    $Stream.WriteLine("   _____  __________  ________   __      __________  ____  __________________")
    $Stream.WriteLine("  /  _  \ \______   \/  _____/  /  \    /  \_____  \/_   |/  _____/\______   \")
    $Stream.WriteLine(" /  /_\  \ |     ___/   \  ___  \   \/\/   //  ____/ |   /   \  ___ |    |  _/")
    $Stream.WriteLine("/    |    \|    |   \    \_\  \  \        //       \ |   \    \_\  \|    |   \")
    $Stream.WriteLine("\____|__  /|____|    \______  /   \__/\  / \_______ \|___|\______  /|______  /")
    $Stream.WriteLine("        \/                  \/         \/          \/            \/        \/ ")
    $Stream.WriteLine("==============================================================================")
    $Stream.WriteLine("📅 GENERATED: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
    $Stream.WriteLine("📊 STATS    : $TotalFiles Files | ~ $TotalLines Lines of Code")
    $Stream.WriteLine("==============================================================================`n")

    # --- CLEAN PROJECT MAP ---
    $Stream.WriteLine("🗺️  PROJECT MAP")
    $Stream.WriteLine("================")
    
    Write-Host "🌳 Building Clean Map..." -ForegroundColor Green

    function Write-DirTree {
        param([string]$Path, [string]$Indent)
        $Items = Get-ChildItem -Path $Path | Where-Object {
            $_.Name -notin $ExcludedFolders -and ($_.PSIsContainer -or $_.Extension -match $AllowedExtensions)
        }
        $Count = $Items.Count; $i = 0
        foreach ($Item in $Items) {
            $i++; $IsLast = ($i -eq $Count)
            $Prefix = if ($IsLast) { "└── " } else { "├── " }
            $ChildIndent = if ($IsLast) { "    " } else { "│   " }
            
            if ($Item.PSIsContainer) {
                $Stream.WriteLine("$Indent$Prefix📂 $($Item.Name)")
                Write-DirTree -Path $Item.FullName -Indent "$Indent$ChildIndent"
            } else {
                $Desc = Get-FileDescription -FilePath $Item.FullName
                $Stream.WriteLine("$Indent$Prefix📄 $($Item.Name)$Desc")
            }
        }
    }
    Write-DirTree -Path $ParentProjectDir -Indent ""
    $Stream.WriteLine("`n`n")

    # --- CONTENT DUMP ---
    $Stream.WriteLine("==========================================")
    $Stream.WriteLine("📦  SOURCE CODE CONTENTS")
    $Stream.WriteLine("==========================================`n")

    $Counter = 0
    foreach ($File in $AllFiles) {
        $Counter++
        $Percent = [math]::Round(($Counter / $TotalFiles) * 100)
        Write-Progress -Activity "Archiving Code..." -Status "$($Counter)/$($TotalFiles)" -PercentComplete $Percent

        $Stream.WriteLine("`n==============================================================================")
        $Stream.WriteLine("📄 FILE: $($File.Name)")
        $Stream.WriteLine("📂 PATH: $($File.FullName)")
        $Stream.WriteLine("==============================================================================`n")

        try {
            $Content = [System.IO.File]::ReadAllText($File.FullName)
            $Stream.WriteLine($Content)
        } catch { $Stream.WriteLine("[ERROR READING FILE]") }
    }
}
finally {
    $Stream.Close(); $Stream.Dispose()
}

Write-Host "`n✅ Done! Clean & Professional Report saved." -ForegroundColor Green