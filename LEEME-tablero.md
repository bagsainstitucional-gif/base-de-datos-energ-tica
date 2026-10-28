# Tablero de gestión BAGSA

Página nueva: `tablero.html`. Se abre desde el menú de `mapa.html` ("Tablero de gestión").

## Cómo subirlo al repositorio

1. Descomprimí el zip.
2. En GitHub, entrá al repositorio y usá **Add file → Upload files**.
3. Arrastrá **todo el contenido** de la carpeta (no la carpeta en sí), así se respetan las subcarpetas `assets/` y `data/`.
4. Confirmá con **Commit changes**. GitHub Pages se actualiza en uno o dos minutos.

Los archivos que ya existen se reemplazan; los demás del repositorio no se tocan.

## Qué incluye

| Archivo | Qué es |
|---|---|
| `tablero.html` | El tablero: 7 pantallas en pestañas y modo presentación |
| `assets/tablero-app.js` | La lógica del tablero (gráficos, filtros, mapa) |
| `assets/fonts/*.woff2` | Encode Sans, convertida desde los .ttf (más liviana para web) |
| `data/tablero.js` | Todos los datos del tablero en un solo archivo |
| `data/datos.js` | **Corregido** (ver abajo). Lo usa `mapa.html` |
| `mapa.html` | Igual que antes, con un enlace nuevo al tablero en el menú |
| `herramientas/generar_tablero.py` | Script que arma `data/tablero.js` desde las planillas (opcional) |

## Uso en reunión

- Botón **Presentar** (arriba a la derecha): pantalla completa y letra más grande.
- Flechas ← → o teclas 1 a 7 para cambiar de pantalla. Esc para salir.
- El filtro de regional (fila de abajo del encabezado) se aplica a todas las pantallas.
- Se puede compartir una vista puntual: `tablero.html#comparativo/SUR` abre el comparativo filtrado por Sur.

## Corrección en datos.js

En la versión anterior, las 43 localidades de gas natural tenían las columnas corridas:
la columna "SGP" mostraba el total de usuarios, "Usuarios" mostraba el consumo y "Consumo" quedaba vacía.
El total de usuarios de la tabla de Localidades estaba mal por eso. Ahora suma 43.067 (planilla de noviembre de 2025).
También se dejó el dato compartido de conectados de Del Carril y Polvaredas una sola vez (antes se sumaba dos veces).

## Fuentes y criterios

- Usuarios y consumo por localidad: USUARIOS_Y_CONSUMO_BAGSA.xlsx (noviembre de 2025).
- Localidades, regional y oficinas: localidades_web-preliminar.xlsx (Tres Arroyos queda afuera: es cabecera, no localidad con servicio).
- Conectados desde 2020 y potenciales: Datos_para_armar_informe_de_apertura_de_sesiones_2027.xlsx.
- Totales de la empresa, demanda, SEF y presupuesto: presentación del 19/08/2026.
- Obras: Informe de obras BAGSA, octubre de 2026.
- Mapa: límites de partidos del IGN (paquete abierto argentina-map-react, licencia MIT). Cada localidad se ubica en el centro de su partido.
- Colores de regional (siempre los mismos en todo el sitio): La Plata azul, Norte naranja, Centro Oeste turquesa, Sur verde, Magdalena violeta, Villa Gesell magenta. Cada regional tiene además su propia forma (círculo, cuadrado, rombo, etc.) para distinguirlas sin depender del color.
