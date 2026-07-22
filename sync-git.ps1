# Script de Sincronização Automática com o GitHub
param (
    [string]$mensagem = "update: sincronizacao automatica $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Iniciando Sincronização com o GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Adicionar alterações
Write-Host "[1/3] Adicionando arquivos alterados..." -ForegroundColor Yellow
git add .

# 2. Criar commit
Write-Host "[2/3] Criando commit..." -ForegroundColor Yellow
git commit -m "$mensagem"

# 3. Enviar para o GitHub
Write-Host "[3/3] Enviando para o repositório remoto (push)..." -ForegroundColor Yellow
git push origin main

Write-Host "`nSincronização concluída com sucesso!" -ForegroundColor Green
