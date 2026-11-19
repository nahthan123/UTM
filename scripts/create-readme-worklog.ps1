param([string]$OutputPath = 'docs/work-logs/nhat-ky-readme-2026-11-19.docx')

# Writes documentation evidence only. Does not run the application, tests or SQL.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspacePath = Split-Path -Parent $PSScriptRoot
$destinationPath = [IO.Path]::GetFullPath((Join-Path $workspacePath $OutputPath))
if (-not $destinationPath.StartsWith($workspacePath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The work log must be saved inside the project workspace.'
}
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
$recordedAt = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'SE Asia Standard Time').ToString('dd/MM/yyyy HH:mm:ss') + ' UTC+7'
function Paragraph([string]$Text, [string]$Style = 'Normal') {
    return '<w:p><w:pPr><w:pStyle w:val="' + $Style + '"/></w:pPr><w:r><w:t xml:space="preserve">' + [Security.SecurityElement]::Escape($Text) + '</w:t></w:r></w:p>'
}
$body = [Collections.Generic.List[string]]::new()
$body.Add((Paragraph 'Nhật ký cập nhật README SkyPermit UTM' 'Title'))
$body.Add((Paragraph 'Ngày 19 tháng 11 năm 2026' 'Subtitle'))
$body.Add((Paragraph ('Lập nhật ký lúc ' + $recordedAt)))
$body.Add((Paragraph 'Đã cập nhật tài liệu khởi chạy dự án với SQL Server Express bên ngoài ứng dụng và quản lý bằng SQL Server Management Studio. Hướng dẫn sử dụng file cấu hình cục bộ, không yêu cầu đặt biến môi trường.'))
$body.Add((Paragraph '1 Yêu cầu và phạm vi thay đổi' 'Heading1'))
$body.Add((Paragraph 'Người dùng yêu cầu viết lại README theo môi trường SQL Server hiện có, máy chủ .\SQLEXPRESS, và bỏ hướng dẫn thiết lập biến môi trường. Đây là thay đổi tài liệu; không thay đổi cấu hình hoặc mã nghiệp vụ.'))
$body.Add((Paragraph 'Chỉ dẫn làm việc được giữ nguyên: không chạy test; chỉ sửa khi được cho phép; tạo file Word ghi nhật ký làm bằng chứng. Nhật ký này là hồ sơ riêng của lần cập nhật README, không ghi đè nhật ký phát triển trước đó.'))
$body.Add((Paragraph '2 Nội dung tài liệu đã cập nhật' 'Heading1'))
$body.Add((Paragraph 'README hướng dẫn mở SSMS, kết nối Database Engine tại .\SQLEXPRESS và sử dụng cơ sở dữ liệu utm. SQL Server là dịch vụ bên ngoài; SSMS dùng để quản trị và chạy script SQL, ứng dụng Spring Boot dùng JDBC để kết nối.'))
$body.Add((Paragraph 'Hướng dẫn tạo application-local.properties tại thư mục gốc, chọn spring.profiles.active=sqlserver và khai báo UTM_DB_URL, UTM_DB_USERNAME, UTM_DB_PASSWORD trực tiếp trong file. Các tên UTM_DB_* ở đây là khóa properties mà cấu hình hiện có đọc, không phải lệnh đặt biến môi trường.'))
$body.Add((Paragraph 'URL minh họa dùng instanceName=SQLEXPRESS và databaseName=utm. Mật khẩu trong README là chỗ điền thông tin riêng của người dùng; nhật ký không sao chép mật khẩu từ file cục bộ.'))
$body.Add((Paragraph 'Khởi tạo ADMIN đầu tiên dùng các khóa utm.bootstrap.username và utm.bootstrap.password trong cùng file cục bộ. Tích hợp mock sử dụng utm.integration.mode. Lệnh khởi chạy PowerShell dùng Maven Wrapper .\mvnw.cmd spring-boot:run.'))
$body.Add((Paragraph 'README phân biệt cơ sở dữ liệu rỗng và cơ sở dữ liệu đã có bảng: chỉ chạy sqlserver-schema.sql cho database mới, tránh chạy lại script tạo bảng trên dữ liệu hiện có; mô tả các script bổ sung tương ứng.'))

$body.Add('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
$body.Add((Paragraph '3 Bằng chứng tài liệu và cấu hình tham chiếu' 'Heading1'))
$body.Add((Paragraph 'Đường dẫn dưới đây tính từ thư mục dự án. SHA256 ghi nhận bản nội dung tại thời điểm lập nhật ký. README là tệp nội dung được sửa trong lần làm việc này; các tệp cấu hình và lớp khởi tạo chỉ được đọc để đối chiếu.'))
foreach ($relativePath in @(
    'README.md',
    'src/main/resources/application.properties',
    'src/main/resources/application-sqlserver.properties',
    'src/main/java/vn/utm/service/InitialData.java'
)) {
    $sourcePath = Join-Path $workspacePath $relativePath
    $hash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
    $body.Add((Paragraph $relativePath 'Evidence'))
    $body.Add((Paragraph ('SHA256 ' + $hash) 'Evidence'))
}
$body.Add((Paragraph '4 Đối chiếu đã thực hiện' 'Heading1'))
$body.Add((Paragraph 'Đọc README và cấu hình sẵn có để đối chiếu: application.properties đã nhập application-local.properties; profile sqlserver đã đọc các khóa UTM_DB_*; InitialData đã hỗ trợ utm.bootstrap.*; utm.integration.mode đã tồn tại. Nội dung hướng dẫn được viết theo cơ chế này.'))
$body.Add((Paragraph 'Không sửa application-local.properties, application.properties, application-sqlserver.properties hoặc mã Java trong lần cập nhật README. Không đọc lại hoặc đưa mật khẩu cục bộ vào nhật ký.'))
$body.Add((Paragraph 'Không chạy test, Maven build, ứng dụng Spring Boot, kết nối SQL Server hoặc script SQL. Các lệnh và bước thao tác trong README là hướng dẫn cho người dùng, chưa được thực thi trong lần làm việc này.'))
$body.Add((Paragraph '5 Giới hạn và bàn giao' 'Heading1'))
$body.Add((Paragraph 'Tài liệu hướng dẫn sử dụng SQL Server bên ngoài ứng dụng; không khẳng định dịch vụ SQL Server, tài khoản, quyền truy cập hoặc schema trên máy người dùng đã được xác minh. Thông số thật được người dùng giữ trong file cục bộ đã loại khỏi Git.'))
$body.Add((Paragraph 'File Word được tạo theo gói OOXML và đọc lại cấu trúc XML. Chưa kiểm tra bố cục bằng ảnh từng trang; lần xuất Word chạy ẩn trước đó bị treo nên không lặp lại trong đợt cập nhật tài liệu này.'))
$body.Add((Paragraph 'Bàn giao: README.md đã cập nhật; nhật ký Word này; script tạo lại riêng scripts/create-readme-worklog.ps1. Người lập nhật ký: Codex theo yêu cầu của chủ dự án.'))

$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ($body -join '') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>'
$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:sz w:val="22"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="110" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="34"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="140"/></w:pPr><w:rPr><w:sz w:val="24"/><w:color w:val="000000"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="140" w:after="90"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Evidence"><w:name w:val="Evidence"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:spacing w:after="70" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>
'@
$parts = @{
    '[Content_Types].xml' = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'
    '_rels/.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
    'word/document.xml' = $document
    'word/styles.xml' = $styles
    'word/_rels/document.xml.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    'docProps/core.xml' = '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Nhật ký cập nhật README SkyPermit UTM ngày 19 tháng 11 năm 2026</dc:title><dc:creator>Codex</dc:creator><dc:description>Hướng dẫn SQL Server bên ngoài ứng dụng và cấu hình bằng file. Không chạy test.</dc:description></cp:coreProperties>'
}
$fileStream = [IO.File]::Open($destinationPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = [IO.Compression.ZipArchive]::new($fileStream, [IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($name in $parts.Keys) {
        [xml]$parsedXml = $parts[$name]
        $entry = $archive.CreateEntry($name)
        $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
        try { $writer.Write($parts[$name]) } finally { $writer.Dispose() }
    }
} finally { $archive.Dispose(); $fileStream.Dispose() }
Write-Output ('Created README work log: ' + $destinationPath)
