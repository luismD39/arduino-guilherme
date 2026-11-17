"""Lê o Arduino pela USB e envia os valores para o site.

Uso:  python ponte.py          (acha a porta sozinho)
      python ponte.py COM5     (força uma porta)
Configuração no arquivo .env ao lado deste script (veja .env.exemplo): URL, TOKEN e, se quiser, PORTA.
O Arduino deve imprimir uma linha por leitura com LDR primeiro e PIR depois, ex.: "350,1" ou "LDR: 350 PIR: 1".
"""
import os
import re
import sys

import requests
import serial
from serial.tools import list_ports

# IDs USB de fabricante: Arduino oficial, CH340 (clones), CP210x, FTDI
VIDS_ARDUINO = {0x2341, 0x2A03, 0x1A86, 0x10C4, 0x0403}


def carregar_env():
    # shortcut: leitor simples de CHAVE=valor (sem aspas nem escapes); trocar por python-dotenv se precisar de mais
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(caminho):
        return
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            if "=" in linha and not linha.lstrip().startswith("#"):
                chave, valor = linha.split("=", 1)
                os.environ.setdefault(chave.strip(), valor.strip())


def achar_porta():
    portas = list_ports.comports()
    usb = [p for p in portas if p.vid is not None]  # ignora Bluetooth e portas internas
    conhecidas = [p for p in usb if p.vid in VIDS_ARDUINO]
    if len(conhecidas) == 1 or (not conhecidas and len(usb) == 1):
        return (conhecidas or usb)[0].device
    lista = ", ".join(f"{p.device} ({p.description})" for p in portas) or "nenhuma"
    sys.exit(f"Não achei o Arduino. Portas encontradas: {lista}. Rode: python ponte.py COMx")


carregar_env()
PORTA = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PORTA")) or achar_porta()
URL = os.environ.get("URL", "http://localhost:5000").rstrip("/") + "/api/estado"
TOKEN = os.environ.get("TOKEN", "")

with serial.Serial(PORTA, 9600, timeout=2) as arduino:
    print(f"Lendo {PORTA} e enviando para {URL}")
    while True:
        linha = arduino.readline().decode(errors="ignore").strip()
        numeros = re.findall(r"\d+", linha)
        if len(numeros) < 2:
            continue
        dados = {"ldr": int(numeros[0]), "pir": int(numeros[1])}
        try:
            r = requests.post(URL, json=dados, headers={"X-Token": TOKEN}, timeout=10)
            print(linha, "->", r.status_code)
        except requests.RequestException as erro:
            print("Falha ao enviar:", erro)
