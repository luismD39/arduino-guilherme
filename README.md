# Parada de Ônibus Inteligente

Arduino (LDR + PIR) → `ponte.py` (no PC, pela USB) → site Flask (Render) → cena no navegador.

## Rodar local
```
pip install -r requirements.txt
python app.py
```
Abra http://localhost:5000. Sem Arduino, marque **Modo simulação** no painel.

## Publicar no Render
1. Suba esta pasta para um repositório no GitHub.
2. No Render: **New → Web Service**, escolha o repositório.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app --workers 1`
5. (Recomendado) Em **Environment**, crie `TOKEN` com uma senha qualquer, para só a sua ponte poder mandar dados.

## Ligar o Arduino ao site
No PC com o Arduino na USB (feche o Monitor Serial da IDE antes):
```
pip install pyserial requests
set URL=https://SEU-APP.onrender.com
set TOKEN=a-mesma-senha-do-render
python ponte.py COM3
```
O Arduino precisa imprimir uma linha por leitura com o LDR primeiro e o PIR depois (ex.: `350,1`). Veja `arduino/parada/parada.ino`.
