"""
APF3 - Servicio minimo de prediccion (prototipo de integracion con el MVP de Paukenito).
Expone  POST /api/prediccion/demanda  que recibe un JSON y devuelve la prediccion del modelo exportado.
Solo biblioteca estandar + joblib/pandas/scikit-learn (requirements.txt). Sin datos personales.

Uso:  python servicio_prediccion.py [puerto]      (por defecto 8765)
Prueba: curl -s -X POST localhost:8765/api/prediccion/demanda -H "Content-Type: application/json" -d @data/ejemplo_integracion_entrada.json
"""
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
import joblib, numpy as np, pandas as pd

ART = joblib.load("model/modelo_demanda.joblib")
ESPECIALES = pd.to_datetime(["2026-05-10", "2026-06-21", "2026-07-19", "2026-07-28", "2026-07-29"])
REQ = ["fecha", "producto_id", "unidades_ayer", "unidades_hace_7_dias", "media_7_dias", "media_14_dias"]

def predecir(r: dict) -> dict:
    f = pd.to_datetime(r["fecha"])
    fila = pd.DataFrame([{"lag_1": r["unidades_ayer"], "lag_7": r["unidades_hace_7_dias"], "media_7": r["media_7_dias"],
        "media_14": r["media_14_dias"], "fin_de_semana": int(f.dayofweek in (5, 6)), "fecha_especial": int(f in ESPECIALES),
        "dia_semana": str(f.dayofweek), "producto_id": str(r["producto_id"])}])[ART["features"]]
    y = float(max(0.0, ART["pipeline"].predict(fila)[0]))
    return {"producto_id": r["producto_id"], "fecha": r["fecha"], "unidades_predichas": round(y, 2),
            "unidades_sugeridas_compra": int(np.ceil(y)), "modelo": ART["modelo"]}

class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode("utf8")
        self.send_response(code); self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        if self.path != "/api/prediccion/demanda": return self._send(404, {"error": "ruta no encontrada"})
        try:
            r = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            faltan = [k for k in REQ if k not in r]
            if faltan: return self._send(400, {"error": "faltan campos", "campos": faltan})
            if int(r["producto_id"]) not in ART["productos"]: return self._send(422, {"error": "producto fuera del alcance del modelo (12 principales)"})
            return self._send(200, predecir(r))
        except Exception as e:
            return self._send(400, {"error": "solicitud invalida", "detalle": str(e)})
    def log_message(self, fmt, *a): print("[servicio]", self.command, self.path, fmt % a, flush=True)

if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Servicio de prediccion en http://127.0.0.1:{puerto}/api/prediccion/demanda", flush=True)
    HTTPServer(("127.0.0.1", puerto), H).serve_forever()
