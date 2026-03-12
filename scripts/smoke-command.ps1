$ErrorActionPreference = "Stop"

$base = if ($env:NXT_BASE_URL) { $env:NXT_BASE_URL.TrimEnd('/') } else { "http://127.0.0.1:3000" }

Write-Host "Smoke test base URL: $base"

$layers = Invoke-RestMethod -Method Get -Uri "$base/api/map/layers?timeRange=90"
if (-not $layers.ok) { throw "map/layers failed" }

$missionBody = @{
  mission = "Reduce cross-border logistics delay"
  mode = "operator"
  timeRange = 90
  layers = @("vendors", "momentum", "risk")
} | ConvertTo-Json -Depth 5

$mission = Invoke-RestMethod -Method Post -Uri "$base/api/mission/analyze" -ContentType "application/json" -Body $missionBody
if (-not $mission.ok) { throw "mission/analyze failed" }

$search = Invoke-RestMethod -Method Get -Uri "$base/api/vendors/search?q=route%20optimization&timeRange=90&limit=5"
if (-not $search.ok) { throw "vendors/search failed" }

if ($search.total -gt 0) {
  $id = $search.results[0].id
  $vendor = Invoke-RestMethod -Method Get -Uri "$base/api/vendors/$id"
  if (-not $vendor.ok) { throw "vendors/{id} failed" }

  $feedbackBody = @{
    truth_card_id = $id
    action = "click"
  } | ConvertTo-Json
  $feedback = Invoke-RestMethod -Method Post -Uri "$base/api/feedback" -ContentType "application/json" -Body $feedbackBody
  if (-not $feedback.ok) { throw "feedback failed" }
}

Write-Host "Smoke test passed."
