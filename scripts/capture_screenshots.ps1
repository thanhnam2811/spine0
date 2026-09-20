# Script to capture live editor screenshots using agent-browser
Write-Host "Opening editor on http://localhost:5174..."
agent-browser open http://localhost:5174
Start-Sleep -Seconds 3

Write-Host "Selecting real-normal-01..."
agent-browser eval "const s = document.querySelector('select'); if (s) { s.value = 'real-normal-01'; s.dispatchEvent(new Event('change', { bubbles: true })); }"
Start-Sleep -Seconds 2

Write-Host "Capturing Screenshot 1: IDLE State..."
agent-browser screenshot docs/phase-c1/evidence/screenshots/01_editor_session_idle.png
Start-Sleep -Seconds 1

Write-Host "Opening Start Session Modal..."
agent-browser eval "document.querySelectorAll('button').forEach(b => { if (b.textContent && b.textContent.includes('Start Session')) b.click(); });"
Start-Sleep -Seconds 1

Write-Host "Clicking Begin Session Tracking..."
agent-browser eval "document.querySelectorAll('button').forEach(b => { if (b.textContent && b.textContent.includes('Begin Session Tracking')) b.click(); });"
Start-Sleep -Seconds 3

Write-Host "Capturing Screenshot 2: ACTIVE State with Timer..."
agent-browser screenshot docs/phase-c1/evidence/screenshots/02_editor_session_active.png
Start-Sleep -Seconds 1

Write-Host "Opening End Session Modal..."
agent-browser eval "document.querySelectorAll('button').forEach(b => { if (b.textContent && b.textContent.includes('End Session')) b.click(); });"
Start-Sleep -Seconds 1

Write-Host "Capturing Screenshot 3: End Session Modal with Visual Verdict Radios..."
agent-browser screenshot docs/phase-c1/evidence/screenshots/03_editor_session_end_modal.png

Write-Host "All 3 screenshots successfully captured!"
