"""Lê o Arduino pela USB e envia os valores para o site.

Uso:  python ponte.py COM3
Variáveis: URL (padrão http://localhost:5000), TOKEN (se o site exigir).
O Arduino deve imprimir uma linha por leitura com LDR primeiro e PIR depois, ex.: "350,1" ou "LDR: 350 PIR: 1".
"""
import os
import re
import sys

import requests
import serial

PORTA = sys.argv[1] if len(sys.argv) > 1 else "COM3"
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
