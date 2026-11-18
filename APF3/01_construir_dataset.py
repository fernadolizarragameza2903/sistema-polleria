"""
APF3 - Paukeñito Pollos & Parrillas
Construye dataset_demanda_diaria.csv a partir del respaldo de la base del MVP
(polleria_db.sql del repositorio sistema-polleria), replicando la vista
vw_dataset_demanda_diaria del Contrato de Datos del APF2.

Uso:  python 01_construir_dataset.py data/polleria_db.sql data/dataset_demanda_diaria.csv

Notas
- El respaldo guarda created_at en UTC; se convierte a hora de Lima (UTC-5).
- Solo ventas completadas del 12/04/2026 al 11/10/2026 (periodo del contrato).
- Sin nombre, DNI, telefono ni direccion de clientes (minimizacion, Ley 29733).
- Se agrega la columna categoria (catalogo del MVP) para el analisis por categoria pedido por el docente para el dashboard.
- Las ventas del MVP son datos de prueba simulados y autorizados por el docente:
  toda fila se rotula origen = 'simulado'.
"""
import re
import sqlite3
import sys

import pandas as pd

SQL_PATH = sys.argv[1] if len(sys.argv) > 1 else "data/polleria_db.sql"
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "data/dataset_demanda_diaria.csv"

sql = open(SQL_PATH, encoding="utf8").read()
db = sqlite3.connect(":memory:")
creadas = set()
patron = r"INSERT INTO `(ventas|detalle_ventas|productos|categorias)` \(([^)]*)\) VALUES\n(.*?);\n"
for tabla, cols, cuerpo in re.findall(patron, sql, re.S):
    cols = cols.replace("`", "")
    if tabla not in creadas:
        db.execute(f"CREATE TABLE {tabla} ({cols})")
        creadas.add(tabla)
    cuerpo = cuerpo.replace("\\'", "''")
    db.execute(f"INSERT INTO {tabla} ({cols}) VALUES {cuerpo}")

ventas = pd.read_sql("SELECT id, tipo_venta, estado, created_at FROM ventas", db)
det = pd.read_sql("SELECT venta_id, producto_id, cantidad, subtotal FROM detalle_ventas", db)
prod = pd.read_sql("SELECT p.id AS producto_id, p.nombre AS producto, c.nombre AS categoria FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id", db)
# el respaldo trae los decimales entre comillas: se convierten a numero antes de sumar
det["cantidad"] = pd.to_numeric(det["cantidad"])
det["subtotal"] = pd.to_numeric(det["subtotal"])

ventas["created_at"] = pd.to_datetime(ventas["created_at"]) - pd.Timedelta(hours=5)
ventas["fecha"] = ventas["created_at"].dt.normalize()
ok = ventas[
    (ventas["estado"] == "completada")
    & (ventas["fecha"] >= "2026-04-12")
    & (ventas["fecha"] <= "2026-10-11")
]

x = det.merge(ok[["id", "fecha", "tipo_venta"]], left_on="venta_id", right_on="id").merge(
    prod, on="producto_id"
)
out = (
    x.groupby(["fecha", "producto_id", "producto", "categoria", "tipo_venta"], as_index=False)
    .agg(unidades_vendidas=("cantidad", "sum"), monto_vendido=("subtotal", "sum"))
)
# dia_semana segun el contrato de datos: 1 = domingo ... 7 = sabado
out["dia_semana"] = (out["fecha"].dt.dayofweek + 1) % 7 + 1
out["origen"] = "simulado"
out["fecha"] = out["fecha"].dt.strftime("%Y-%m-%d")
out = out[["fecha", "dia_semana", "producto_id", "producto", "categoria", "tipo_venta",
           "unidades_vendidas", "monto_vendido", "origen"]].sort_values(
    ["fecha", "producto_id", "tipo_venta"])
out.to_csv(OUT_PATH, index=False, encoding="utf-8")

print("ventas completadas en periodo:", ok.shape[0])
print("filas de la vista:", out.shape[0], "| productos:", out["producto_id"].nunique())
print("rango:", out["fecha"].min(), "->", out["fecha"].max())
