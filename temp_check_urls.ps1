$urls = @("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js","https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js","https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js","https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js","https://cdn.jsdelivr.net/npm/litepicker/dist/litepicker.js")
foreach ($url in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    Write-Output "$url => $($r.StatusCode) len $($r.Content.Length)"
  } catch {
    Write-Output "$url => ERR $($_.Exception.Message)"
  }
}
