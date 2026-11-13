@echo off
cd /d "%~dp0"
echo Iniciando o Simulador de Canhao em http://localhost:5173
echo (feche esta janela para parar o servidor)
start "" http://localhost:5173
python -m http.server 5173
