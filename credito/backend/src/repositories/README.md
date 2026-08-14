# Repositories Firestore

Capa de acceso unificada con **lectura canónica primero** y **fallback legacy**, sin migración de datos ni cambios en frontend/rutas.

## Rutas

| Dominio | Canónico (leer primero) | Legacy (fallback) |
|---------|-------------------------|-------------------|
| Cliente | `empresas/{cuit}` | `clients/{cuit}` |
| Balances | `empresas/{cuit}/balances` | `balances/{cuit}/items`, `balances` where `cuit` |
| IVA (fiscal) | `empresas/{cuit}/iva` → `{ declaraciones: [...] }` | `iva/{cuit}`, `iva` where `cuit` |
| IIBB (fiscal) | `empresas/{cuit}/iibb` | `iibb/{cuit}`, `iibb` where `cuit` |
| BCRA | `empresas/{cuit}/bcra_reports` (último) | `bcra/{cuit}` |
| Cheques | `empresas/{cuit}/cheques` | `cheques/{cuit}/items` |
| Calificación | — | **Escritura/lectura:** `qualification/{cuit}` |

Constantes: `firestore-paths.js`.

## Módulos

- `firestore-client.repository.js` → `getClientByCuit`
- `firestore-balance.repository.js` → `listBalancesByCuit`
- `firestore-iva.repository.js` → `getIvaFiscalByCuit`
- `firestore-iibb.repository.js` → `getIibbFiscalByCuit`
- `firestore-bcra.repository.js` → `getBcraByCuit`
- `firestore-cheque.repository.js` → `listChequesByCuit`
- `firestore-qualification.repository.js` → `saveQualificationByCuit`, `getQualificationByCuit`

## Consumidores actuales

- `qualification.service.js` (`buildQualification`, `getQualification`)

Los servicios `client`, `balance`, `iva`, `iibb` **siguen escribiendo en legacy** hasta la fase de dual-write.

## TODO migración (futuro)

1. Dual-write en POST `/api/balance`, `/api/iva`, `/api/iibb` hacia `empresas/{cuit}/…`
2. Persistir `GET /api/bcra/:cuit` en `empresas/{cuit}/bcra_reports`
3. Scripts batch desde colecciones planas → subcolecciones `empresas`
4. Unificar `clients` con `empresas/{cuit}`
5. Métricas de fallback; retirar lectura legacy
6. Opcional: historial de `qualification` versionado por `schemaVersion`
