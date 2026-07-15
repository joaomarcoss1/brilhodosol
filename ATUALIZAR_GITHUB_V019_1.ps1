$ErrorActionPreference = "Stop"

$source = (Get-Location).Path
$repo = "$HOME\Downloads\brilhodosol-v019-1-repositorio"

if (-not (Test-Path "$source\package.json")) {
    throw "Execute este script dentro da pasta extraída da v019.1, onde está o package.json."
}

if (Test-Path $repo) {
    Remove-Item $repo -Recurse -Force
}

git clone https://github.com/joaomarcoss1/brilhodosol.git $repo
if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível clonar o repositório."
}

# Remove a versão antiga da árvore de trabalho, preservando somente o histórico Git.
Get-ChildItem $repo -Force |
Where-Object { $_.Name -ne ".git" } |
ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

# Copia os ARQUIVOS da v019.1 diretamente para a raiz do repositório.
Get-ChildItem $source -Force |
Where-Object { $_.Name -notin @(".git", "node_modules", ".next", ".vercel") } |
ForEach-Object { Copy-Item $_.FullName -Destination $repo -Recurse -Force }

Set-Location $repo

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript falhou." }

npm run lint
if ($LASTEXITCODE -ne 0) { throw "Lint falhou." }

npx vitest run --reporter=verbose --maxWorkers=1
if ($LASTEXITCODE -ne 0) { throw "Os testes falharam." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "O build falhou. Nada será enviado ao GitHub." }

git add -A
git commit -m "Corrige estrutura da v019 e suporte a múltiplas filiais"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nenhuma alteração nova para commit ou o commit falhou. Confira git status."
}

git push origin main
if ($LASTEXITCODE -ne 0) { throw "O push para o GitHub falhou." }

Write-Host "Atualização concluída. A v019.1 está na raiz do repositório."
