import os
import time

from flask import Flask, abort, jsonify, render_template, request

app = Flask(__name__)
TOKEN = os.environ.get("TOKEN", "")  # se definido, a ponte precisa mandar o mesmo valor no header X-Token
LIMITE_LDR = 400  # abaixo disso é noite (mesma regra do LED verde)
TEMPO_LIMITE = 5  # segundos sem leitura = Arduino desconectado

# shortcut: estado fica na memória, some quando o Render reinicia e exige 1 worker; trocar por banco se precisar de histórico
estado = {"ldr": 1023, "pir": 0, "pessoas": 0, "atualizado": None}


@app.get("/")
def index():
    return render_template("index.html", limite=LIMITE_LDR)


@app.get("/api/estado")
def ler_estado():
    conectado = estado["atualizado"] is not None and time.time() - estado["atualizado"] < TEMPO_LIMITE
    if not conectado:  # não mostra leitura velha: cena volta para dia sem movimento
        return jsonify({**estado, "ldr": 1023, "pir": 0, "conectado": False})
    return jsonify({**estado, "conectado": True})


@app.post("/api/estado")
def gravar_estado():
    if TOKEN and request.headers.get("X-Token") != TOKEN:
        abort(401)
    dados = request.get_json(silent=True) or {}
    try:
        ldr, pir = int(dados["ldr"]), int(dados["pir"])
    except (KeyError, TypeError, ValueError):
        abort(400)
    if not (0 <= ldr <= 1023 and pir in (0, 1)):
        abort(400)
    if pir and not estado["pir"]:  # conta só a borda de subida do sensor
        estado["pessoas"] += 1
    estado.update(ldr=ldr, pir=pir, atualizado=time.time())
    return jsonify(estado)


if __name__ == "__main__":
    app.run(debug=True)
