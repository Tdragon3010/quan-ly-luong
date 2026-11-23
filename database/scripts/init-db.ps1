# Tạo lại CSDL quan_ly_luong: chạy schema.sql rồi seed.sql
# Chạy: npm run init-db   (hoặc powershell -ExecutionPolicy Bypass -File database\scripts\init-db.ps1)
$dbDir = Split-Path -Parent $PSScriptRoot      # thư mục database/
$root = Split-Path -Parent $dbDir              # thư mục gốc dự án (chứa .env)
$envFile = Join-Path $root '.env'
$cfg = @{}
Get-Content $envFile -Encoding UTF8 | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object {
    $cfg[$Matches[1]] = $Matches[2].Trim()
}
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$env:MYSQL_PWD = $cfg['DB_PASSWORD']
# DB_SSL=true trong .env (MySQL trên Aiven): bắt buộc kết nối mã hóa
$ssl = if ("$($cfg['DB_SSL'])".ToLower() -eq 'true') { '--ssl-mode=REQUIRED' } else { '' }
foreach ($f in 'schema.sql', 'seed.sql') {
    Write-Host "Đang chạy $f ..."
    $path = Join-Path $dbDir $f
    # Dùng cmd để chuyển nguyên byte của file vào stdin (đường dẫn có dấu tiếng Việt
    # làm lệnh "source" của mysql không mở được file)
    cmd /c "`"$mysql`" -h $($cfg['DB_HOST']) -P $($cfg['DB_PORT']) -u $($cfg['DB_USER']) $ssl --default-character-set=utf8mb4 < `"$path`""
    if ($LASTEXITCODE -ne 0) { Remove-Item Env:MYSQL_PWD; throw "Lỗi khi chạy $f" }
}
Remove-Item Env:MYSQL_PWD
Write-Host "Hoàn tất: đã tạo CSDL quan_ly_luong trên $($cfg['DB_HOST'])."
