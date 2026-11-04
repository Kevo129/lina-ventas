# Lina Health · Sistema de Ventas

Reemplazo de la **Base de Ventas** de Airtable. Es código propio: Postgres + app web en Next.js.
No depende de licencias por usuario y los datos son 100% tuyos.

## Qué incluye

| Módulo | Qué hace | Antes en Airtable |
|---|---|---|
| **Tablero** | Venta del mes vs meta de $2M, proyección, pipeline ponderado, por cobrar, ventas por mes/segmento, top cuentas | (no existía) |
| **Pipeline** *(nuevo)* | Oportunidades por etapa (prospecto → ganada/perdida), fuente (Meta, Google, TikTok, LinkedIn…), siguiente paso, bitácora de llamadas/visitas | (no existía) |
| **Cotizaciones** | Todas las cotizaciones (no solo ganadas), partidas, pagos, envíos, PDF | Cotizaciones Ganadas |
| **Cuentas / Contactos** | Instituciones con segmento (universidad pública/privada, consultor…) y sus personas | Cuentas / Clientes |
| **Logística** | Lo vendido sin entregar: sin OC, en tránsito, en stock. Asignación masiva de OC/pedimento | Pedidos \| Stock \| Envíos |
| **Órdenes de compra** | Compras a proveedor con historial de pagos y facturas | Órdenes de Compra |
| **Importaciones** | Pedimentos y aduanas | Importaciones |
| **Productos / Proveedores** | Catálogo con piezas vendidas/por entregar/en stock; marcas unificadas | Productos |
| **Cobranza** *(nuevo)* | Saldos por antigüedad (0-30, 31-60, 61-90, +90 días) | (no existía) |
| **Cuentas por pagar** *(nuevo)* | Saldos con proveedores por moneda | (no existía) |

Las fórmulas de Airtable (Estatus, Saldo Pendiente, Subtotal, Total en Stock, etc.) viven en las vistas de `db/002_vistas.sql`.

## Puesta en marcha (≈ 30 min)

1. **Base de datos y archivos — Supabase** (plan gratuito alcanza para empezar)
   - Crea un proyecto en supabase.com.
   - En *Storage*, crea un bucket **privado** llamado `archivos`.
   - Copia `.env.ejemplo` → `.env.local` y llena `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` y `SESSION_SECRET`.
2. **Instalar y crear tablas**
   ```bash
   npm install
   npm run db:esquema          # requiere psql; o pega db/001 y db/002 en el SQL Editor de Supabase
   ```
3. **Migrar desde Airtable**
   - Crea un token en airtable.com/create/tokens con `data.records:read` y `schema.bases:read` sobre "Base de Ventas".
   ```bash
   AIRTABLE_TOKEN=pat_xxx npm run migrar:exportar   # descarga JSON + todos los PDFs a migracion/datos
   npm run migrar:importar                          # carga a Postgres y verifica que todo cuadre
   ```
   El importador corre en una sola transacción y al final compara conteos y saldos contra Airtable (✔/✘).
   Si algo no cuadra, no se queda a medias. `migracion/datos/` es además tu respaldo completo de Airtable.
4. **Crear tu usuario**
   ```bash
   npm run usuario -- kevin.paz@linahp.com "Kevin" admin TuContraseña
   ```
   Los demás (Adelina, Roy, Leonor) se crean desde *Configuración* dentro de la app.
5. **Publicar — Vercel**
   - Sube el repo a GitHub, impórtalo en vercel.com y pega las mismas variables de `.env.local`.
   - Para desarrollo local: `npm run dev` → http://localhost:3000

### Ensayo sin tocar datos reales
```bash
DATOS_DIR=/tmp/prueba node migracion/generar-prueba.mjs
DATOS_DIR=/tmp/prueba npm run migrar:importar
```

## Notas de la migración
- **Pagos**: Airtable solo guardaba "Saldo" (monto cobrado). Se migra como un pago "Migrado" por cotización/OC; de ahí en adelante cada abono se registra por separado.
- **Envíos**: las partidas con la misma cotización + paquetería + guía + fecha se agrupan en un solo envío. Guía "N/A" se deja vacía.
- **Proveedores**: "Marca" (productos) y "Proveedor" (OCs) se unifican; p. ej. "Sunbird" y "Sunbird S.A. de C.V." quedan como uno.
- **Vendedor**: los colaboradores de Airtable se crean como usuarios sin contraseña (se activan desde Configuración).
- Las cuentas migradas quedan sin **segmento**: vale la pena clasificarlas para que el tablero muestre ventas por tipo de cliente.
- Advertencias (contactos con 2 instituciones, folios duplicados) se guardan en `migracion/datos/_advertencias.txt`.

## Estructura
```
db/            esquema SQL y vistas (fórmulas)
migracion/     exportar de Airtable, importar a Postgres, datos de prueba
app/           pantallas (Next.js App Router) y acciones del servidor (app/acciones.js)
components/    piezas de interfaz compartidas
lib/           conexión a BD, sesión, formato, almacenamiento de archivos
scripts/       alta de usuarios
```
