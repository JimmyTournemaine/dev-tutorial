#!/usr/bin/env pwsh
Add-Type -AssemblyName System.Web

$ErrorActionPreference = "Stop"

function dowload {
    $Workflow = "Compose bundle"

    $Branch = git branch --show-current
    $RemoteUri = git config --get remote.origin.url
    $RepoUri = $RemoteUri -Replace '.git$',''

    $WorkflowEncoded = [System.Web.HttpUtility]::UrlEncode($Workflow)
    $BranchEncoded = [System.Web.HttpUtility]::UrlEncode($Branch)
    $GitHubUri = "$RepoUri/actions?query=workflow%3A%22$WorkflowEncoded%22+is%3Asuccess+branch%3A$BranchEncoded"

    New-Item -Name "dist" -ItemType "directory" -Force | Out-Null

    Write-Output 'Missing executable, please download the latest artifact to the ./dist folder (or install python!)'
    Write-Output 'Please select the last build and download the artifact in the "Artifacts" section at the bottom of the page'
    Write-Output 'Your web browser will open in a few seconds'

    Start-Sleep 3
    start $GitHubUri
}

$exe = where.exe python
if($exe) {
    $exe = "$exe .\compose.py"
} elseif([System.IO.File]::Exists('compose.exe')) {
    $exe = '.\compose.exe'
} else {
    download
}

# Run
& "$exe $($args -Join ' ')"
