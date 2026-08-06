$urls = @("https://cdn.jsdelivr.net/npm/litepicker/dist/litepicker.js")
foreach ($url in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    $head = $r.Content -split "\n" | Select-Object -First 20
    Set-Content -Path litepicker_head.txt -Value $head -Encoding utf8
  } catch {
    Set-Content -Path litepicker_head.txt -Value "ERR $($_.Exception.Message)" -Encoding utf8
  }
}
