# Motor de Límite SC-1.0 — cerrado para producción

## Entrypoint

```ts
import { runLimitEngine } from "@/lib/creditLimit"

runLimitEngine({
  score,
  revision,
  commercialContext,
  override, // opcional
  computedAt: null,
})
```

## Etapas

1–9 + 6.5 Manual Overrides — funciones puras en `engine/stages/`.

## Contratos clave

- `CommercialContext`
- `LimitOverride`
- `SuggestedLimitResult.limitOrigin`
- `DecisionStep` (`previousValue`, `newValue`, `resultCode`, `ruleId`)

