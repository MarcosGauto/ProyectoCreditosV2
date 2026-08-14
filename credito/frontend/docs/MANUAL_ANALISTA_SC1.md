# Manual de Usuario — Plataforma SC-1.0

**Audiencia:** Analistas de crédito  
**Propósito:** Operar e interpretar el Score y el límite sugerido SC-1.0 sin necesidad de conocimientos técnicos  
**Complementos:** [Manual de Ajustes](./MANUAL_AJUSTES_SC1.md) · [Workbook de calibración](./SC1_CALIBRATION_WORKBOOK.xlsx)

---

## Índice

1. [¿Qué es SC-1.0?](#1-qué-es-sc-10)
2. [¿Qué información analiza?](#2-qué-información-analiza)
3. [¿Cómo calcula el Score?](#3-cómo-calcula-el-score)
4. [¿Qué significa cada dimensión?](#4-qué-significa-cada-dimensión)
5. [¿Cómo interpretar el resultado?](#5-cómo-interpretar-el-resultado)
6. [¿Cómo se calcula el límite sugerido?](#6-cómo-se-calcula-el-límite-sugerido)
7. [Sección Ajustes](#7-sección-ajustes)
8. [Ejemplos completos](#8-ejemplos-completos)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)
10. [Buenas prácticas](#10-buenas-prácticas)
11. [Estado vs Score](#11-estado-vs-score)

---

## 1. ¿Qué es SC-1.0?

SC-1.0 es una **segunda lectura automática del riesgo** del cliente, pensada para el analista de crédito.

Mientras usted trabaja el análisis habitual de la plataforma, SC-1.0 elabora en paralelo:

| Resultado | Qué le aporta |
|-----------|----------------|
| **Score propio** (0 a 1000) | Un puntaje de riesgo según la política de la organización |
| **Estado del cliente** | Resumen funcional del riesgo (Aprobado / Observado / Riesgo Alto / No Recomendado) |
| **Nivel de confianza** | Qué tan completo estuvo el cálculo (¿faltaron datos?) |
| **Límite sugerido** | Un monto de línea sugerido, con una decisión asociada (aprobar, revisar, denegar, etc.) |

### Idea clave

Hoy SC-1.0 es **comparativo**: ayuda a decidir y a documentar, pero **aún no reemplaza** el veredicto operativo histórico de la plataforma. En pantalla verá un aviso del tipo:

> *Resultado paralelo — no reemplaza el veredicto operativo legacy.*

Úselo como **apoyo de criterio**, no como botón automático de aprobación.

```text
Datos del cliente (balances, BCRA, cheques, cobertura, precal…)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 Análisis habitual          SC-1.0
 (veredicto actual)     Score + Límite sugerido
        │                       │
        └───────────┬───────────┘
                    ▼
           Usted decide y publica
                    │
                    ▼
            Historial y Cartera
```

---

## 2. ¿Qué información analiza?

SC-1.0 no inventa datos: usa la información que ya está en el análisis del cliente.

### Bloques que sí pesan hoy en el Score

| Información | Dimensión del Score | En palabras simples |
|-------------|---------------------|---------------------|
| Ratios de liquidez | **Liquidez** | ¿Puede pagar lo que vence pronto? |
| Ratio de endeudamiento | **Endeudamiento** | ¿Cuánto debe respecto de su estructura? |
| Ratio de rentabilidad | **Rentabilidad** | ¿Genera resultado de forma razonable? |
| Legajo (balance, IVA, IIBB, etc.) | **Documentación** | ¿El expediente está completo y usable? |
| Situación en el sistema financiero | **BCRA** | ¿Cómo figura ante el BCRA? |
| Cheques rechazados | **Cheques** | ¿Hay rechazos? ¿Cuántos? |
| Resultado de cobertura operativa | **Cobertura** | ¿Opera con cobertura o sin ella? |

### Información que alimenta el límite (además del Score)

| Información | Uso |
|-------------|-----|
| Ventas / datos de la precalificación | Base comercial del monto sugerido |
| Estado del Score | Escala el límite (más riesgo → menos línea) |
| Configuración de Ajustes → Límite | Factor comercial, multiplicadores, restricciones |

### Dimensiones que aparecen en Ajustes pero **no cuentan hoy**

Estas dimensiones existen en la pantalla de configuración para evoluciones futuras. **No modifican el Score activo** mientras estén reservadas:

| Dimensión | Estado actual |
|-----------|---------------|
| Antigüedad | Reservada — no interviene en el puntaje de hoy |
| Actividad | Reservada — no interviene |
| Comportamiento comercial | Reservada — no interviene |

> **Consejo:** no intente “mejorar el score” cambiando solo antigüedad o actividad en Ajustes: hoy no mueven el resultado.

---

## 3. ¿Cómo calcula el Score?

El Score se arma como un **promedio ponderado** de varias miradas (dimensiones).

1. Cada dimensión recibe un **puntaje propio** (según reglas de la política: umbrales, tramos, checklist).  
2. Cada dimensión tiene un **peso** (importancia relativa, en %).  
3. El sistema combina puntajes y pesos y obtiene un **Score final entre 0 y 1000**.  
4. Ese número se traduce a un **Estado del cliente** (Aprobado, Observado, Riesgo Alto o No Recomendado) para facilitar la lectura.

### Participación relativa (configuración por defecto)

Solo las **siete dimensiones activas** intervienen. Sus pesos de referencia en producto son:

| Dimensión | Peso | Participación relativa entre las 7 |
|-----------|------|--------------------------------------|
| Liquidez | 15 % | ████████████████░░░░ ~19 % |
| Endeudamiento | 12 % | █████████████░░░░░░░ ~15 % |
| Rentabilidad | 12 % | █████████████░░░░░░░ ~15 % |
| Documentación | 12 % | █████████████░░░░░░░ ~15 % |
| BCRA | 10 % | ███████████░░░░░░░░░ ~13 % |
| Cheques | 10 % | ███████████░░░░░░░░░ ~13 % |
| Cobertura | 8 % | █████████░░░░░░░░░░░ ~10 % |

```text
Participación aproximada (solo dimensiones activas)

Liquidez        ████████████████████
Endeudamiento   ███████████████
Rentabilidad    ███████████████
Documentación   ███████████████
BCRA            █████████████
Cheques         █████████████
Cobertura       ██████████
                0%                 20%
```

**Lectura práctica:** si un cliente falla en Liquidez (peso alto), el Score cae más que si falla solo en Cobertura (peso menor). Si falla en varias a la vez, el castigo se acumula.

### Estado del Cliente

El **Estado** resume la evaluación general realizada por la Plataforma SC-1.0.

| Estado | Significado |
|--------|-------------|
| 🟢 **Aprobado** | Cliente apto para operar. |
| 🟡 **Observado** | El cliente presenta aspectos que requieren revisión o seguimiento. |
| 🟠 **Riesgo Alto** | El cliente presenta indicadores de riesgo importantes. |
| 🔴 **No Recomendado** | No se recomienda otorgar crédito en las condiciones actuales. |

El Estado es la **interpretación funcional del Score**. El sistema continúa utilizando internamente una clasificación técnica (por ejemplo AAA, AA, A) para el cálculo y la comparación histórica, pero el analista visualiza principalmente el Estado.

En el detalle del análisis SC-1.0 puede aparecer, de forma secundaria, el **Nivel interno** (p. ej. AA). Sirve para usuarios avanzados o administradores que necesiten la granularidad del cálculo; no reemplaza la lectura operativa del Estado.

**Importante:**  
El Estado no reemplaza al Score numérico. Es una forma simplificada de interpretar el resultado obtenido por el motor SC-1.0. Dos clientes pueden compartir el mismo Estado y tener Scores diferentes.

> En Cartera e Historial verá el Estado. En el bloque de detalle SC-1.0 verá Estado + Score, y opcionalmente el Nivel interno.

---

## 4. ¿Qué significa cada dimensión?

### 4.1 Liquidez

| | |
|--|--|
| **Qué analiza** | Capacidad de afrontar deudas de corto plazo (ratio de liquidez del análisis). |
| **Qué impacto tiene** | Peso alto. Una liquidez floja suele bajar fuerte el Score y, con él, el Estado y el límite. |
| **Cómo mejorarla (cliente / legajo)** | Mejorar capital de trabajo, reducir pasivo corto, o documentar causas temporales (estacionalidad) para el criterio humano. |
| **Qué datos utiliza** | Ratio de liquidez corriente del análisis financiero. |

**Ejemplo:** liquidez 2,2 → aporte bueno. Liquidez 0,7 → aporte muy bajo en esa dimensión.

---

### 4.2 Endeudamiento

| | |
|--|--|
| **Qué analiza** | Nivel de deuda relativa / apalancamiento. |
| **Qué impacto tiene** | Endeudamiento alto castiga el Score; en combinación con liquidez floja suele empujar a Observado, Riesgo Alto o No Recomendado. |
| **Cómo mejorarla** | Plan de desendeudamiento, refinanciación ordenada, menos deuda de corto plazo. |
| **Qué datos utiliza** | Ratio de endeudamiento del análisis. |

**Ejemplo:** deuda 0,35 → favorable. Deuda 0,85 → fuerte castigo en la dimensión.

---

### 4.3 Rentabilidad

| | |
|--|--|
| **Qué analiza** | Capacidad de generar resultado (rentabilidad medida en el análisis). |
| **Qué impacto tiene** | Un ejercicio flojo baja el Score; no siempre implica caja rota (puede coexistir con buena liquidez). |
| **Cómo mejorarla** | Mejorar márgenes, explicar pérdidas puntuales vs estructurales, presentar ejercicios más representativos. |
| **Qué datos utiliza** | Ratio de rentabilidad del análisis. |

**Ejemplo:** rentabilidad 0,12 → aporte sólido. Rentabilidad 0,01 → aporte débil aunque la caja esté sana.

---

### 4.4 Documentación

| | |
|--|--|
| **Qué analiza** | Completitud y usabilidad del legajo (balance, IVA, IIBB y demás requisitos de la organización). |
| **Qué impacto tiene** | Legajo incompleto baja el Score documental. Además, usted debería condicionar operativamente la línea. |
| **Cómo mejorarla** | Completar y validar documentación faltante antes de publicar o desembolsar. |
| **Qué datos utiliza** | Checklist documental del análisis / requisitos definidos en Ajustes → Documentación. |

**Ejemplo:** faltan IVA e IIBB → la dimensión Documentación aporta poco, aunque los ratios financieros sean buenos.

---

### 4.5 BCRA

| | |
|--|--|
| **Qué analiza** | La peor situación informada en el sistema del BCRA para el deudor. |
| **Qué impacto tiene** | Situación 1 es la más favorable. Situaciones más altas castigan el Score comercial. Situaciones graves suelen empujar a Riesgo Alto / No Recomendado o rechazo de límite. |
| **Cómo mejorarla** | Depende del deudor y del tiempo; el analista debe pedir contexto (regularización, causas, garantías). |
| **Qué datos utiliza** | Situación BCRA cargada / informada en el análisis. |

| Situación (orientativa) | Lectura para el analista |
|-------------------------|---------------------------|
| 1 | Perfil más favorable en esta dimensión |
| 2 | Observación: pedir contexto |
| 3 o más | Riesgo elevado: no tratarlo como “situación 1” |

---

### 4.6 Cheques

| | |
|--|--|
| **Qué analiza** | Cantidad de cheques rechazados considerados en el Score. |
| **Qué impacto tiene** | Cero rechazos favorece. Varios rechazos castigan fuerte el perfil comercial. |
| **Cómo mejorarla** | Regularizar, explicar causas, evitar nuevas rechazos; verificar que el dato esté bien cargado. |
| **Qué datos utiliza** | Cantidad de rechazos informada en el análisis. |

> **Atención:** si el dato de cheques no está cargado, el sistema puede mostrar “0”. Eso **no siempre** significa “cero rechazos reales”: valide la fuente.

---

### 4.7 Cobertura

| | |
|--|--|
| **Qué analiza** | El resultado de cobertura operativa del análisis (con cobertura / sin cobertura, según catálogo de la organización). |
| **Qué impacto tiene** | “Sin cobertura” suele aportar 0 en la dimensión y además puede activar restricciones en el límite (por ejemplo, exigir garantía). |
| **Cómo mejorarla** | Lograr cobertura operativa válida según política comercial, o documentar excepciones con comité. |
| **Qué datos utiliza** | Estado / resultado de cobertura del análisis. |

**Ejemplo:** cliente con ratios medios pero **sin cobertura** → Score más bajo y límite más restrictivo aunque el resto “se vea aceptable”.

---

## 5. ¿Cómo interpretar el resultado?

En el **Decision Cockpit** verá el bloque **SC-1.0** junto al análisis habitual.

### 5.1 Puntaje (Final Score)

| Lectura | Significado |
|---------|-------------|
| Cercano a 1000 | Perfil muy favorable según la política vigente |
| Zona media (p. ej. 650–849) | Aceptable a bueno: revisar matices |
| Bajo / No Recomendado | Máxima cautela |

El número **solo tiene sentido junto con** el Estado, la confianza y el detalle de dimensiones.

### 5.2 Estado del Cliente

El Estado traduce el puntaje a una lectura de negocio (Aprobado … No Recomendado).  
También orienta el **límite sugerido**: a mayor riesgo (Riesgo Alto / No Recomendado), menor línea o denegación según política.

Donde antes se leía “Categoría: AAA”, ahora se lee **“Estado: Aprobado”**. El cálculo interno sigue usando la clasificación técnica; el analista opera con el Estado.

**Ejemplo de lectura en el detalle SC-1.0:**

| Campo | Ejemplo |
|-------|---------|
| **Estado** | 🟢 Aprobado *(primero — ¿qué hago?)* |
| **Score** | 842 puntos |
| **Nivel interno** | AA *(secundario)* |
| **Confianza** | Alta |
| **Límite sugerido** | Monto / decisión |
| **Cobertura** | Lectura de la dimensión |
| **Motivos principales** | Hallazgos y justificaciones |

El **Nivel interno** no cambia la decisión operativa: solo conserva la granularidad del modelo (AAA / AA / A / BBB / BB / B).

### 5.3 Nivel de confianza (Confidence)

Responde: *“¿El sistema pudo evaluar de forma completa las dimensiones activas?”*

| Nivel | Lectura práctica |
|-------|------------------|
| **Alta** | Casi todas las piezas entraron; el Score es más usable |
| **Media** | Faltó algo o no todo fue evaluable; revise el legajo |
| **Baja** | Cálculo incompleto: **no tome el Score al pie de la letra** |

**Regla de oro:** Score alto + confianza baja → investigue qué faltó (cobertura, documentación, datos) antes de confiar en el número.

### 5.4 Observaciones y señales de decisión

En el panel de límite puede ver:

| Señal | Cómo usarla |
|-------|-------------|
| Decisión de aprobar / condicionar | Apoyo a una línea, no sustituto de su criterio |
| Revisión manual | El sistema pide ojo humano: documente y revise |
| Denegar / 🔴 No Recomendado | No sugerir línea (según política) |
| Mensaje “Calculando SC-1.0…” | Espere antes de publicar |
| Error de SC-1.0 | No publique hasta resolver |

### 5.5 Historial

1. Abra una versión **publicada** del cliente.  
2. El bloque SC-1.0 aparece como **foto del día de publicación** (no se recalcula al abrir el historial).  
3. Sirve para auditar qué Score, Estado, confianza y límite se congelaron esa fecha.

### 5.6 Cartera

En Cartera puede filtrar u ordenar por Score SC-1.0, Estado, confianza y límite sugerido del **último análisis publicado**.  
Si ve “—” o vacío, ese cliente aún no tiene SC-1.0 publicado.

---

## 6. ¿Cómo se calcula el límite sugerido?

El límite sugerido es un **proceso en capas**, pensado en lenguaje de negocio:

```text
1. Se obtiene el Score y su estado
            │
2. Se toma una base comercial
   (por ejemplo, un % de las ventas promedio de la precal)
            │
3. Se aplica el multiplicador según el resultado del Score
   (Aprobado ≈ línea más alta … No Recomendado ≈ 0 % / denegar)
            │
4. Se aplican restricciones
   (confianza baja, sin cobertura, techos, garantías…)
            │
5. Resultado: monto sugerido + decisión
```

### Valores de referencia (producto)

| Concepto | Referencia típica |
|----------|-------------------|
| Factor comercial | 20 % sobre ventas promedio |
| Estado 🟢 Aprobado (mejor tramo) | hasta 100 % |
| Estado 🟢 Aprobado (tramos medios) | 70–90 % |
| Estado 🟡 Observado | ~40 % |
| Estado 🟠 Riesgo Alto | ~40 % |
| Estado 🔴 No Recomendado | 0 % y **denegar** (sin línea sugerida) |
| Confianza baja | Puede reducir el límite (p. ej. −40 %) |
| Sin cobertura | Puede exigir garantía u otras condiciones |

### Ejemplo numérico sencillo

| Paso | Cálculo ilustrativo |
|------|---------------------|
| Ventas promedio | $10.000.000 |
| Factor comercial 20 % | Base = $2.000.000 |
| Estado Aprobado / tramo medio (× 70 %) | $1.400.000 |
| Confianza alta, con cobertura | Sin recorte adicional |
| **Límite sugerido** | **≈ $1.400.000** |

Si el mismo cliente cayera a **No Recomendado**, el sugerido pasa a **$0** (denegar), aunque la base comercial fuera alta.

---

## 7. Sección Ajustes

**Ruta:** menú **Ajustes → Ajustes SC-1.0**

La pantalla de Ajustes **no calcula** el Score ni el límite en el momento.  
Lo que hace es **guardar la política** de la organización. Esa política se usa en el **próximo análisis** que corra SC-1.0.

| Botón | Función |
|-------|---------|
| **Guardar** | Confirma los cambios para los próximos análisis |
| **Cancelar** | Descarta el borrador |
| **Restaurar valores por defecto** | Vuelve al estándar de producto (luego hay que Guardar) |

Coordine cambios con Riesgo: un ajuste pequeño puede mover estados y límites de toda la cartera nueva.

---

### 7.1 Pesos

| | |
|--|--|
| **Qué significa** | Importancia relativa de cada dimensión en el Score. |
| **Qué efecto produce** | Subir el peso de Liquidez hace que un problema de caja duela más en el puntaje final. |
| **Cuándo modificarlo** | Tras medir una muestra de casos y tener una hipótesis escrita (por ejemplo: “estamos sobreponderando documentación”). |
| **Riesgos** | Sobreponderar un solo factor; o mover pesos de dimensiones **reservadas** creyendo que cambian el Score (hoy no lo hacen). |
| **Regla de pantalla** | La suma de pesos de las dimensiones **habilitadas** debe ser **100 %** o no podrá Guardar. |

---

### 7.2 Bandas / Estados

| | |
|--|--|
| **Qué significa** | Rangos de Score que, en pantalla, se muestran como Estados (Aprobado, Observado, Riesgo Alto, No Recomendado). |
| **Qué efecto produce** | Mueven cuántos clientes caen en cada Estado y, con ello, el multiplicador de límite. |
| **Cuándo modificarlo** | Si la cartera se concentra de forma irracional en No Recomendado u otro Estado. |
| **Riesgos** | Solapar rangos; ensanchar el tramo más bajo y marcar “No Recomendado” a clientes que no lo son; achicar ese tramo sin criterio y “maquillar” riesgo. |

---

### 7.3 Confidence (umbrales)

| | |
|--|--|
| **Qué significa** | Umbrales asociados a la completitud del cálculo. |
| **Qué efecto produce** | La **confidence mínima** influye en si el resultado se considera usable. Los chips Alta/Media/Baja en pantalla siguen reglas de producto (alta ≈ 85 % o más de dimensiones con puntaje; media ≈ 60 %). |
| **Cuándo modificarlo** | Con cuidado y con Riesgo; no como primer dial de calibración. |
| **Riesgos** | Subir demasiado el mínimo → muchos casos “insuficientes”. Bajarlo demasiado → aceptar cálculos flojos. |

---

### 7.4 Reglas (por dimensión)

Las reglas concretas (umbrales de liquidez, tramos de BCRA, puntos por cheques, etc.) viven en la política de producto y se detallan operativamente en el **Workbook**.  
En la práctica diaria del analista:

* no se “editan a mano” caso por caso en el Cockpit;  
* se interpretan a través del Score y de las dimensiones;  
* se recalibran a nivel organización (Riesgo), no por intuición de un solo legajo.

| | |
|--|--|
| **Qué significan** | Criterios que convierten un dato (ratio, situación, checklist) en puntos de esa dimensión. |
| **Qué efecto producen** | Definen cuándo una liquidez es “buena” o “mala” en puntos. |
| **Cuándo modificarlas** | Solo en procesos de calibración formal. |
| **Riesgos** | Cambiar reglas sin medir impacto → Scores incomparables entre periodos. |

---

### 7.5 Límites (pestaña Límite)

| Parámetro | Qué significa | Efecto | Cuándo tocar | Riesgos |
|-----------|---------------|--------|--------------|---------|
| **Factor comercial** | % sobre ventas promedio | Define la base del monto | Tras alinear Score | Inflar líneas (p. ej. 50 % sin criterio) |
| **Moneda** | Moneda de expresión | Etiqueta el resultado | Alinear a operación | Mezclar monedas |
| **Techo global** | Tope absoluto opcional | Corta sugerencias altas | Si hay límite máximo de política | Techo demasiado bajo traba buenos clientes |
| **Requerir Score OK** | Exige resultado de Score válido | Puede no sugerir si el Score no está OK | Cuando quiera frenar casos incompletos | Bloquear demasiados legajos flojos |
| **Multiplicadores por resultado** | Escala según Estado / tramo de Score | Directo sobre el monto | Después de estabilizar bandas | Relajar No Recomendado sin denegar → línea en casos críticos |
| **Denegar en No Recomendado** | Niega límite en el tramo más bajo | Monto 0 / denegar | Mantener salvo decisión de comité | Quitar denegar sin gobernanza |
| **Plazos por tramo** | Horizontes asociados | Informan el resultado | Alinear a comercial | Plazos inconsistentes |

---

### 7.6 Cobertura y restricciones

| | |
|--|--|
| **Qué significa** | Condiciones que recortan o condicionan el límite (confianza baja, sin cobertura, garantías). |
| **Qué efecto produce** | Ejemplo: confianza baja → reducir 40 %; sin cobertura → exigir garantía. |
| **Cuándo modificarlo** | Cuando la política comercial de garantías cambie de verdad. |
| **Riesgos** | Olvidar el tratamiento de “sin cobertura”; o relajar restricciones y exponer la cartera. |

---

### 7.7 Overrides

| | |
|--|--|
| **Qué significa** | Excepciones o forzado de resultado definidos a nivel de política de límite (no un “botón mágico” del analista en cada caso). |
| **Qué efecto produce** | Pueden alterar el camino estándar del sugerido cuando la política lo contempla. |
| **Cuándo usarlos** | Solo bajo norma interna de Riesgo / comité. |
| **Riesgos** | Normalizar excepciones y perder consistencia entre analistas. |

Para el día a día: si el sistema pide **revisión manual**, documente la excepción en la publicación; no “force” el número sin respaldo.

---

### 7.8 Documentación, Alertas e IA (otras pestañas)

| Pestaña | Para el analista |
|---------|------------------|
| **Documentación** | Define qué exige el legajo (mínimos y por tipo de empresa). Impacta la dimensión Documentación. |
| **Alertas** | Configuración preparatoria; **sin envío real en esta fase**. |
| **IA** | Marcada como **sin ejecución** en esta fase: no la use para decidir crédito. |

---

## 8. Ejemplos completos

> Casos **didácticos** (no clientes reales), alineados a la lógica de producto. Sirven para capacitación.

### Caso 1 — Cliente excelente

| Paso | Detalle |
|------|---------|
| **Entrada** | Liquidez 2,2 · Deuda 0,35 · Rentabilidad 0,12 · Docs completos · BCRA 1 · 0 cheques · Con cobertura · Ventas promedio $12 M |
| **Dimensiones** | Todas aportan alto |
| **Score / Estado** | Zona alta → **🟢 Aprobado** (ilustrativo) |
| **Confianza** | Alta |
| **Límite** | Base 20 % × $12 M = $2,4 M → × ~90–70 % según estado → sugerencia robusta |
| **Lectura** | Perfil alineado; contrastar igual con el análisis habitual y garantías comerciales |

---

### Caso 2 — Cliente bueno

| Paso | Detalle |
|------|---------|
| **Entrada** | Liquidez 1,6 · Deuda 0,50 · Rentabilidad 0,06 · Docs ok · BCRA 1 · 0 cheques · Con cobertura · Ventas $8 M |
| **Dimensiones** | Financieras correctas; comerciales limpias |
| **Score / Estado** | Zona **🟢 Aprobado / 🟡 Observado** alta |
| **Confianza** | Alta |
| **Límite** | Base $1,6 M × multiplicador Aprobado/Observado → línea moderada-alta |
| **Lectura** | Buen candidato; vigilar evolución de deuda y rentabilidad |

---

### Caso 3 — Cliente regular

| Paso | Detalle |
|------|---------|
| **Entrada** | Liquidez 1,2 · Deuda 0,65 · Rentabilidad 0,03 · Falta IIBB · BCRA 2 · 1 cheque · Con cobertura · Ventas $5 M |
| **Dimensiones** | Financieras mixtas; BCRA 2 y un rechazo; documentación incompleta |
| **Score / Estado** | Zona **🟡 Observado / 🟠 Riesgo Alto** |
| **Confianza** | Media o alta según qué se pudo evaluar |
| **Límite** | Multiplicador ~40 % sobre base → línea acotada; posible pedido de completar legajo |
| **Lectura** | Condicionar: completar docs, explicar BCRA 2 y el rechazo |

---

### Caso 4 — Cliente riesgoso

| Paso | Detalle |
|------|---------|
| **Entrada** | Liquidez 0,9 · Deuda 0,80 · Rentabilidad 0,01 · Docs parciales · BCRA 3 · 2 cheques · Sin cobertura · Ventas $6 M |
| **Dimensiones** | Varios castigos a la vez (caja, deuda, BCRA, cheques, cobertura) |
| **Score / Estado** | Zona **🟠 Riesgo Alto / 🔴 No Recomendado** |
| **Confianza** | Variable; si cobertura no matchea, puede bajar |
| **Límite** | Muy reducido o con exigencias fuertes de garantía; posible revisión manual |
| **Lectura** | No expandir línea; comité / mitigantes claros |

---

### Caso 5 — Cliente rechazado (No Recomendado)

| Paso | Detalle |
|------|---------|
| **Entrada** | Liquidez 0,7 · Deuda 0,90 · Rentabilidad negativa · Docs incompletos · BCRA 4 · 4 cheques · Sin cobertura |
| **Dimensiones** | Comercial y financiero muy castigados |
| **Score / Estado** | **🔴 No Recomendado** |
| **Confianza** | Puede ser media/alta si igual se evaluó todo “en rojo” |
| **Límite** | **$0 / denegar** (multiplicador 0 + denegar en No Recomendado) |
| **Lectura** | Rechazo o esquema excepcional solo con comité y garantías extraordinarias; no ignorar el resultado |

---

## 9. Preguntas frecuentes

### ¿Por qué un cliente tiene alta confianza?

Porque el sistema pudo puntuar **casi todas** las dimensiones activas. Alta confianza **no** significa “cliente excelente”: un cliente puede tener Score bajo (malo) con confianza alta (el cálculo estuvo completo y el resultado es “malos números bien medidos”).

### ¿Qué significa “sin cobertura”?

Que el resultado operativo de cobertura del análisis indica que **no opera con cobertura** (según el catálogo de la organización). En el Score suele aportar poco o nada en esa dimensión y en el límite puede activar **restricciones** (por ejemplo, exigir garantía).

### ¿Por qué el límite quedó en cero?

Causas frecuentes:

1. Estado **No Recomendado** (denegar / multiplicador 0).  
2. Decisión de denegar por política.  
3. Score no usable y la configuración exige Score OK.  
4. Restricciones fuertes (cobertura / garantías) que dejan sin sugerencia positiva.

Revise Estado, decisión del panel de límite y restricciones de Ajustes.

### ¿Cómo afecta un cheque rechazado?

Cada rechazo empeora la dimensión **Cheques** y baja el Score. Varios rechazos, sumados a BCRA desfavorable, suelen empujar a Observado / Riesgo Alto / No Recomendado y reducir o anular el límite.

### ¿Qué significa una observación del BCRA?

Una situación distinta de 1 (por ejemplo situación 2) indica **mayor riesgo informado** en el sistema financiero. No es un detalle menor: pida contexto, no lo homologue a “situación normal” y documente el criterio.

### ¿Por qué el Score es alto pero no me convence?

Mire la **confianza**. Si es baja o media, faltaron piezas. También contraste siempre con el análisis habitual: SC-1.0 es apoyo paralelo, no veredicto único.

### ¿Cambiar Ajustes modifica análisis ya publicados?

No. El **Historial** conserva la foto del día de publicación. Los cambios de Ajustes aplican a los **próximos** análisis.

---

## 10. Buenas prácticas

1. **Lea siempre juntos** el análisis habitual y el bloque SC-1.0.  
2. **No decida solo por el número**: mire Estado, confianza y límite.  
3. **Confianza baja** = revise datos; no asuma automáticamente “cliente malo”.  
4. **Complete el legajo** antes de pelearse con el Score: documentación y cobertura suelen explicar sorpresas.  
5. **Valide cheques y BCRA** en la fuente; un “0” o una situación mal cargada distorsiona el resultado.  
6. **Publique solo cuando SC-1.0 esté listo** (si la comparación está activa): evita historiales incompletos.  
7. **No calibure por intuición** pesos o bandas en un solo caso: coordine con Riesgo y mida una muestra.  
8. **Ignore Antigüedad / Actividad / Comportamiento comercial** para explicar el Score de hoy: no intervienen.  
9. Use **Historial** para auditar el pasado y **Cartera** para priorizar la cola con Score/Estado/confianza.  
10. Ante **revisión manual** o **No Recomendado**, deje notas claras en la publicación: el criterio humano debe quedar trazado.

---

### Glosario rápido

| Término | Significado para el analista |
|---------|------------------------------|
| **Score** | Puntaje 0–1000 según la política SC-1.0 |
| **Estado** | Aprobado / Observado / Riesgo Alto / No Recomendado |
| **Nivel interno** | Clasificación técnica (AAA…B); detalle opcional |
| **Confianza** | Completitud del cálculo |
| **Cobertura** | Resultado operativo de cobertura del cliente |
| **Límite sugerido** | Monto de línea que propone SC-1.0 |
| **Ajustes** | Política de la organización (pesos, bandas, límites…) |
| **Historial** | Versiones publicadas (foto congelada) |
| **Cartera** | Vista de clientes con último SC-1.0 publicado |

---

## 11. Estado vs Score

El Estado es una interpretación funcional del resultado generado por la Plataforma SC-1.0 y está pensado para facilitar la lectura por parte del analista.

El Score numérico continúa siendo el indicador principal utilizado por el motor.

Internamente, la plataforma conserva una clasificación técnica (AAA, AA, A, BBB, BB y B) que permite mantener compatibilidad histórica, realizar comparaciones y facilitar futuras calibraciones.

El analista no necesita utilizar esa clasificación para operar normalmente, aunque puede consultarla cuando requiera un mayor nivel de detalle.

**Orden de lectura recomendado en pantalla:** Estado → Score → Nivel interno → Confianza → Límite sugerido → Cobertura → Motivos principales.

| Campo | Ejemplo |
|-------|---------|
| **Estado** | 🟢 Aprobado |
| **Score** | 842 puntos |
| **Nivel interno** | AA |
| **Confianza** | Alta |

| Estado visible | Nivel interno | Interpretación |
|----------------|---------------|----------------|
| 🟢 Aprobado | AAA / AA / A | Cliente apto para operar según la política vigente. |
| 🟡 Observado | BBB | Requiere análisis adicional o seguimiento. |
| 🟠 Riesgo Alto | BB | Riesgo significativo; evaluar cuidadosamente antes de otorgar crédito. |
| 🔴 No Recomendado | B | No se recomienda otorgar crédito. |

**Importante:** El Score es el resultado numérico calculado por el motor SC-1.0. El Estado es su interpretación funcional para facilitar la toma de decisiones. El Nivel interno se conserva únicamente para análisis técnico, auditoría, calibración y comparaciones históricas.

---

*Manual de Usuario funcional — Plataforma SC-1.0 · Analistas de crédito*

