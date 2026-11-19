param(
    [string]$OutputPath = 'docs/work-logs/nhat-ky-2026-11-19.docx',
    [ValidateSet('not-run', 'succeeded', 'failed')]
    [string]$CompilationStatus = 'not-run',
    [ValidateSet('not-rendered', 'verified')]
    [string]$RenderingStatus = 'not-rendered'
)

# Creates a text-only Word work log from the current source snapshot.
# This script neither starts the application nor runs builds or tests.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspacePath = Split-Path -Parent $PSScriptRoot
$resolvedOutputPath = [IO.Path]::GetFullPath((Join-Path $workspacePath $OutputPath))
if (-not $resolvedOutputPath.StartsWith($workspacePath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The work log must be written inside the project workspace.'
}
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedOutputPath)) | Out-Null
$vietnamTime = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'SE Asia Standard Time')
$generatedAt = $vietnamTime.ToString('dd/MM/yyyy HH:mm:ss') + ' UTC+7'

function Escape-Xml([string]$Text) { return [Security.SecurityElement]::Escape($Text) }
function Paragraph([string]$Text, [string]$Style = 'Normal') {
    return '<w:p><w:pPr><w:pStyle w:val="' + $Style + '"/></w:pPr><w:r><w:t xml:space="preserve">' + (Escape-Xml $Text) + '</w:t></w:r></w:p>'
}
function Page-Break { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' }

$paragraphs = [Collections.Generic.List[string]]::new()
$paragraphs.Add((Paragraph 'Nhật ký phát triển SkyPermit UTM' 'Title'))
$paragraphs.Add((Paragraph 'Ngày làm việc 19 tháng 11 năm 2026' 'Subtitle'))
$paragraphs.Add((Paragraph ('Thời điểm lập bằng chứng: ' + $generatedAt)))
$paragraphs.Add((Paragraph 'Nhật ký ghi nhận thay đổi mã nguồn cho luồng nộp kế hoạch nhiều UAV, phê duyệt và chuẩn bị tích hợp mô phỏng, giám sát bằng mock. Nội dung phản ánh mã nguồn đã lưu; chưa xác nhận kết quả chạy ứng dụng.'))
$paragraphs.Add((Paragraph '1 Căn cứ và phạm vi được giao' 'Heading1'))
$paragraphs.Add((Paragraph 'Người dùng cho phép triển khai bằng yêu cầu: “cần bổ xung j thì bổng xung đi, làm luôn phần chuẩn bị tích hợp (có thể mock). code đi”. Chỉ dẫn áp dụng: không chạy test; chỉ code khi được cho phép; tạo file Word lưu nhật ký sau khi sửa.'))
$paragraphs.Add((Paragraph 'Căn cứ nghiệp vụ: hai bản thuyết minh, hai bộ slide và Excel hướng dẫn trong thư mục 23_10. Tài liệu mô tả ba loại UAV, kế hoạch 4D, ADMIN duyệt rồi chuyển tới mô phỏng và giám sát.'))
$paragraphs.Add((Paragraph '2 Luồng nghiệp vụ đã bổ sung' 'Heading1'))
$paragraphs.Add((Paragraph 'Người vận hành chọn nhiều UAV, nhập tên điểm đi, điểm đến, thời gian và waypoint. Số lượng được tính từ UAV được chọn; mỗi UAV có một kế hoạch riêng, dùng chung mã đợt nộp submissionId. Mỗi kế hoạch được xem xét và duyệt riêng.'))
$paragraphs.Add((Paragraph 'Kế hoạch mới sử dụng WGS84, độ cao AGL trong khoảng 0 đến 120 m và thời gian UTC. Dữ liệu kế hoạch cũ giữ tham chiếu AMSL để tránh tự diễn giải lại độ cao đã lưu.'))
$paragraphs.Add((Paragraph 'ADMIN duyệt hoặc từ chối, lưu người duyệt, thời điểm và ghi chú. Người vận hành xem kết quả, lộ trình và tải JSON của kế hoạch được duyệt. MANAGER giữ quyền xem và cập nhật giai đoạn đang bay, hoàn thành theo luồng phân quyền.'))
$paragraphs.Add((Paragraph 'Ba loại UAV trên giao diện: Multirotor, Fixed-wing và Hybrid VTOL. Bộ thông số mô phỏng tham khảo lần lượt: thời gian bay 25, 60, 45 phút; tốc độ tối đa 20, 30, 26 m/s. Các giá trị này là giả định của đề tài.'))

$paragraphs.Add((Page-Break))
$paragraphs.Add((Paragraph '3 Chuẩn bị tích hợp mô phỏng và giám sát' 'Heading1'))
$paragraphs.Add((Paragraph 'Sau phê duyệt, hệ thống lưu bản ghi giao nhận riêng cho hai đích SIMULATION và MONITORING trong cơ sở dữ liệu. Payload chứa định danh bản tin, phiên bản schema, người vận hành, UAV, lộ trình 4D, thời gian và quy ước tọa độ.'))
$paragraphs.Add((Paragraph 'Các sự kiện gồm flightplan.accepted, flightplan.cancelled và flightplan.status.changed. Thông tin giao nhận được lưu bền vững để xem lại và gửi lại khi cần.'))
$paragraphs.Add((Paragraph 'Chế độ mock ghi nhận biên nhận và trạng thái MOCK_DELIVERED. Chế độ disabled giữ PENDING. Chưa kết nối HTTP tới hệ thống ngoài và chưa khởi động SITL, Gazebo hay dashboard giám sát thật.'))
$paragraphs.Add((Paragraph 'Nhân sự quản lý xem danh sách giao nhận; ADMIN có thao tác gửi lại. Người vận hành chỉ xem giao nhận thuộc kế hoạch của mình. Kế hoạch đã hủy không được phát lại như một kế hoạch còn hiệu lực.'))
$paragraphs.Add((Paragraph '4 Các giao diện API bổ sung' 'Heading1'))
foreach ($line in @(
    'POST /api/flights/batch: nộp một đợt kế hoạch cho nhiều UAV.',
    'PUT /api/flights/{id}/status: thêm ghi chú xét duyệt reviewNote.',
    'GET /api/flights/{id}/accepted-plan: lấy JSON kế hoạch được duyệt.',
    'GET /api/flights/{id}/integration: xem giao nhận theo kế hoạch.',
    'GET /api/integrations: danh sách giao nhận cho ADMIN/MANAGER.',
    'POST /api/integrations/{id}/retry: ADMIN gửi lại bản tin.'
)) { $paragraphs.Add((Paragraph $line 'Compact')) }
$paragraphs.Add((Paragraph '5 Dữ liệu và cấu hình' 'Heading1'))
$paragraphs.Add((Paragraph 'Bổ sung thông tin điểm đi, điểm đến, đợt nộp, số UAV, tham chiếu độ cao và quyết định xét duyệt trong flight_plans; thêm bảng giao nhận tích hợp. Script H2 và SQL Server được lưu cùng mã nguồn, kết hợp bộ khởi tạo cơ sở dữ liệu.'))
$paragraphs.Add((Paragraph 'Cấu hình utm.integration.mode chọn mock hoặc disabled. Việc thay adapter mock bằng kết nối thật là công việc tích hợp tiếp theo; không được diễn giải MOCK_DELIVERED thành bằng chứng UAV đã bay.'))

$paragraphs.Add((Page-Break))
$paragraphs.Add((Paragraph '6 Bằng chứng mã nguồn tại thời điểm lập nhật ký' 'Heading1'))
$paragraphs.Add((Paragraph 'Đường dẫn dưới đây là tương đối với thư mục dự án. Mã SHA256 rút gọn giúp đối chiếu đúng bản mã nguồn khi đọc nhật ký; chạy lại script lập nhật ký sẽ cập nhật dấu vân tay.'))
$evidencePaths = @(
    'src/main/java/vn/utm/model/FlightPlan.java',
    'src/main/java/vn/utm/dto/request/BatchFlightRequest.java',
    'src/main/java/vn/utm/dto/response/FlightPlanResponse.java',
    'src/main/java/vn/utm/service/UtmService.java',
    'src/main/java/vn/utm/controller/UtmController.java',
    'src/main/java/vn/utm/model/IntegrationDelivery.java',
    'src/main/java/vn/utm/service/FlightIntegrationService.java',
    'src/main/java/vn/utm/controller/IntegrationController.java',
    'src/main/resources/static/app.js',
    'src/main/resources/static/index.html',
    'src/main/resources/db/sqlserver-flight-integration.sql',
    'src/main/resources/db/h2-flight-integration.sql',
    'docs/contracts/flightplan-event.schema.json',
    'docs/contracts/flightplan-accepted.example.json',
    'docs/integration.md'
)
foreach ($relativePath in $evidencePaths) {
    $sourcePath = Join-Path $workspacePath $relativePath
    if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
        $hash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.Substring(0, 16)
        $paragraphs.Add((Paragraph ($relativePath + '  SHA256 ' + $hash) 'Evidence'))
    }
}
$paragraphs.Add((Paragraph '7 Hoạt động kiểm tra và giới hạn' 'Heading1'))
$paragraphs.Add((Paragraph 'Đã đọc mã nguồn và đối chiếu giao diện API, phân quyền, dữ liệu đầu vào và script schema. Không chạy test tự động, test thủ công, ứng dụng hoặc môi trường mô phỏng theo chỉ dẫn của người dùng. Nhật ký không xác nhận chức năng đã chạy thành công.'))
$compilationText = switch ($CompilationStatus) {
    'succeeded' { 'Biên dịch Maven hoàn tất BUILD SUCCESS lúc 14:25:33 UTC+7 ngày 19/11/2026 với -Dmaven.test.skip=true compile; đã bỏ qua biên dịch mã test và chạy test. Kết quả biên dịch không thay thế xác nhận vận hành.' }
    'failed' { 'Đã thử biên dịch Maven với -Dmaven.test.skip=true compile nhưng chưa hoàn tất thành công. Không chạy test; cần xử lý nguyên nhân biên dịch trước khi triển khai.' }
    default { 'Chưa thực hiện kiểm tra biên dịch trong phạm vi nhật ký này.' }
}
$paragraphs.Add((Paragraph $compilationText))
$paragraphs.Add((Paragraph 'Chưa triển khai phát hiện xung đột chiến lược, thuật toán AI, telemetry, SITL/Gazebo hoặc giám sát 3D. Luồng mock chỉ chuẩn bị hợp đồng dữ liệu và bằng chứng giao nhận cho bước tích hợp sau.'))
$renderingText = if ($RenderingStatus -eq 'verified') {
    'File Word được tạo từ gói OOXML, xuất bản xem trước bằng Word chạy ẩn và đọc ảnh từng trang để rà soát bố cục. Việc rà soát tài liệu không chạy mã dự án hoặc test.'
} else {
    'File Word được tạo từ gói OOXML và đã đọc lại cấu trúc XML. Đã thử xuất PDF bằng Word chạy ẩn nhưng chưa hoàn tất nên chưa xác nhận bố cục bằng ảnh từng trang.'
}
$paragraphs.Add((Paragraph $renderingText))
$paragraphs.Add((Paragraph 'Người lập nhật ký: Codex, thực hiện theo yêu cầu và quyền chỉnh sửa của chủ dự án.'))

$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + ($paragraphs -join '') + '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="350" w:footer="350"/><w:cols w:space="708"/></w:sectPr></w:body></w:document>'
$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:sz w:val="22"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="110" w:line="265" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="150"/></w:pPr><w:rPr><w:color w:val="000000"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="150" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Compact"><w:name w:val="Compact"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="65" w:line="250" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="21"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Evidence"><w:name w:val="Evidence"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:spacing w:after="65" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>
'@
$entries = @{
    '[Content_Types].xml' = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'
    '_rels/.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
    'word/document.xml' = $document
    'word/styles.xml' = $styles
    'word/_rels/document.xml.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'
    'word/footer1.xml' = '<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>SkyPermit UTM   Trang </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>'
    'docProps/core.xml' = '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Nhật ký phát triển SkyPermit UTM ngày 19 tháng 11 năm 2026</dc:title><dc:creator>Codex</dc:creator><dc:description>Nhật ký thay đổi mã nguồn theo yêu cầu chủ dự án. Không chạy test.</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">' + [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ') + '</dcterms:created></cp:coreProperties>'
}
$stream = [IO.File]::Open($resolvedOutputPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($partName in $entries.Keys) {
        [xml]$parsedPart = $entries[$partName]
        $entry = $archive.CreateEntry($partName)
        $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
        try { $writer.Write($entries[$partName]) } finally { $writer.Dispose() }
    }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Output ('Created work log: ' + $resolvedOutputPath)
