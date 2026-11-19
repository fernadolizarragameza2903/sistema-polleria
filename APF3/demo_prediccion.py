"""
APF3 - Demo en vivo: carga el modelo exportado y predice la demanda de un registro nuevo.
Usa la misma funcion predecir() del servicio de integracion (servicio_prediccion.py).

Uso:
    python demo_prediccion.py                       -> ejemplo del MVP (Oferta Paukenito, 21/09/2026)
    python demo_prediccion.py 93 2026-10-07 0 4 4.14 3.5
        argumentos: producto_id fecha unidades_ayer unidades_hace_7_dias media_7_dias media_14_dias
"""
import json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
os.chdir(AQUI); sys.path.insert(0, AQUI)                # funciona desde cualquier carpeta
from servicio_prediccion import ART, predecir          # carga model/modelo_demanda.joblib

if len(sys.argv) == 7:
    pid, fecha, ayer, hace7, m7, m14 = sys.argv[1:]
    entrada = {"fecha": fecha, "producto_id": int(pid), "unidades_ayer": float(ayer),
               "unidades_hace_7_dias": float(hace7), "media_7_dias": float(m7), "media_14_dias": float(m14)}
    real = None
else:
    entrada = json.load(open("data/ejemplo_integracion_entrada.json", encoding="utf-8"))
    real = json.load(open("data/ejemplo_integracion.json", encoding="utf-8"))["real"]

if entrada["producto_id"] not in ART["productos"]:
    sys.exit(f"producto_id {entrada['producto_id']} fuera de los 12 modelados: {sorted(ART['productos'])}")

print("Modelo cargado :", ART["modelo"], "(model/modelo_demanda.joblib)")
print("Producto       :", ART["productos"][entrada["producto_id"]])
print("ENTRADA (JSON del MVP):")
print(json.dumps(entrada, ensure_ascii=False, indent=2))
salida = predecir(entrada)
print("SALIDA del modelo:")
print(json.dumps(salida, ensure_ascii=False, indent=2))
if real is not None:
    print(f"Valor real ese dia: {real:g} unidades")
