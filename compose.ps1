#!/usr/bin/env pwsh

param (
    [Parameter(Mandatory=$false)][Switch]$help,
    [Parameter(Mandatory=$false)][Switch]$verb,
    [Parameter(Mandatory=$false)][Switch]$dry,
    [Parameter(Mandatory=$false)][Switch]$dev,
    [Parameter(Mandatory=$false)][Switch]$test,
    [Parameter(Mandatory=$false)][Switch]$ci,
    [Parameter(Mandatory=$false)][Switch]$prod,
    [Parameter(Mandatory=$false)][string]$environment = 'dev'
)

function run {
    param([string]$cmd)

    If($verb) {
        Write-Host $cmd
    }
    If($dry) {
        return
    }
    
    Invoke-Expression $cmd
    $exit_code = $?
    if($exit_code -gt 0) {
        exit $exit_code
    }
}

function compose {
    param([string]$environment)

    # python compatible sys.platform label
    If($IsMacOS) {
        $sysplatform = 'darwin'
    } ElseIf($IsLinux) {
        $sysplatform = 'linux'
    } Else {
        $sysplatform = 'windows'
    }
    
    If('darwin' -eq $sysplatform) {
        run 'docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect'
    }

    $host_workspace = $PSScriptRoot
    $deployer_workspace = '/usr/src/dev-tutorial'

    # Run deployer
    run 'docker build -t dev-tutorial-deployer ./dev-tutorial-deployer'
    run "docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM=$sysplatform -e WORKSPACE_HOSTED=$host_workspace -e WORKSPACE_LOCAL=$deployer_workspace -v /var/run/docker.sock:/var/run/docker.sock -v $host_workspace/dev-tutorial-deployer:/etc/ansible -v $host_workspace/:$deployer_workspace -v $deployer_workspace/ansible dev-tutorial-deployer ansible-playbook playbooks/test.yml"

    # Follow containers logs
    $threads = @(
        Start-Job { run "docker logs -fn 0 dev-tutorial-api-$environment | sed -e 's/^/\033[0;33mbackend\t| \033[0m/'" }
        Start-Job { run "docker logs -fn 0 dev-tutorial-app-$environment | sed -e 's/^/\033[0;32mfrontend\t| \033[0m/'" }
    )
    
    # SIGINT handler
    $terminate = { $threads | Foreach-Object { Stop-Job $_ } }
    [Console]::TreatControlCAsInput = $true
    Do {
        $Key = $Host.UI.RawUI.ReadKey("AllowCtrlC")
    } While([Int]$Key.Character -ne 3)
    [Console]::TreatControlCAsInput = $False

    # Wait for termination with SIGINT(^C)
    $threads | Foreach-Object { Wait-Job $_ } | Out-Null
    Write-Host "`nStopping following logs but your containers are STILL RUNNING!"
}

function usage {
    Write-Host 'Usage: $($args[0]) [options]'
    Write-Host '-help    : display this help'
    Write-Host '-verbose : increase verbosity'
    Write-Host '-environment <dev|test|ci|prod> : set the environment'
    Write-Host '  -dev'
    Write-Host '  -test'
    Write-Host '  -ci'
    Write-Host '  -prod'
}

if($help) {
    usage
    exit 0
}

if(!$PSBoundParameters.ContainsKey('environment')) {
    $envs = 'dev', 'test', 'ci', 'prod'
    foreach($env in $envs) {
        if($PSBoundParameters.ContainsKey('$env')) {
            $environment = $env
        }
    }
}
if($environment -eq $null) {
    usage
    exit 2
}
compose $environment
