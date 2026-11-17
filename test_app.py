from app import app, estado

c = app.test_client()
assert c.get("/").status_code == 200
assert c.post("/api/estado", json={"ldr": 300}).status_code == 400
assert c.post("/api/estado", json={"ldr": 5000, "pir": 0}).status_code == 400
assert c.post("/api/estado", json={"ldr": 300, "pir": 1}).status_code == 200
c.post("/api/estado", json={"ldr": 300, "pir": 1})  # ainda em movimento: não conta de novo
assert estado["pessoas"] == 1
r = c.get("/api/estado").get_json()
assert r["ldr"] == 300 and r["conectado"]
estado["atualizado"] -= 10  # simula 10 s sem leitura
r = c.get("/api/estado").get_json()
assert not r["conectado"] and r["ldr"] == 1023 and r["pir"] == 0
print("ok")
