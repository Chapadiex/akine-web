Actualizar la documentación operativa de los agentes para que las reglas de UX/UI de AKINE sean obligatorias y transversales.

## Objetivo
Incorporar la lectura y cumplimiento obligatorio de `AKINE_UI_RULES.md` en todos los documentos de instrucciones de agentes, para evitar rediseños improvisados, inconsistencias visuales y repetición de correcciones pantalla por pantalla.

## Archivo fuente de verdad
Tomar como referencia obligatoria:

`/AKINE_UI_RULES.md`

Ese archivo debe considerarse la guía visual transversal del producto para cualquier tarea de frontend, UX/UI o ajuste visual.

## Tareas a realizar

### 1. Actualizar documentos de agentes
Revisar y actualizar los archivos de instrucciones existentes del proyecto, al menos:
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`

Si alguno no existe, crearlo.

### 2. Agregar regla obligatoria de lectura
En cada uno de esos archivos, incorporar una sección explícita que indique que:

- antes de modificar cualquier pantalla, formulario, tabla, modal, tabs, stepper, header, filtros o acción visual,
- el agente debe leer y respetar `AKINE_UI_RULES.md`.

### 3. Declarar prioridad de la regla
Dejar explícito que `AKINE_UI_RULES.md` es la fuente de verdad visual del producto y que tiene prioridad sobre decisiones ad hoc del agente.

### 4. Agregar restricciones obligatorias
Incluir como reglas mínimas:
- no improvisar rediseños,
- no crear patrones nuevos si ya existe uno aprobado,
- no agrandar componentes para “mejorar claridad”,
- no convertir tabs o steppers en botones grandes,
- no romper consistencia visual entre pantallas equivalentes,
- no dejar filtros avanzados visibles por defecto salvo necesidad real.

### 5. Agregar respuesta previa obligatoria
En los documentos de agentes, agregar que antes de implementar cualquier cambio visual deben indicar:
1. qué patrón existente van a reutilizar,
2. qué van a simplificar,
3. qué van a eliminar,
4. cómo van a reducir peso visual,
5. cómo van a mantener consistencia con otras pantallas.

### 6. No duplicar innecesariamente todo el archivo
No copiar completo `AKINE_UI_RULES.md` dentro de todos los documentos.
Solo referenciarlo de forma obligatoria y resumir las reglas clave.
El archivo canónico sigue siendo `AKINE_UI_RULES.md`.

## Resultado esperado
- Los documentos `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` quedan actualizados.
- Todos hacen referencia explícita a `AKINE_UI_RULES.md`.
- Queda claro que su lectura es obligatoria antes de tocar UI.
- Queda incorporada la respuesta previa obligatoria antes de implementar cambios visuales.
- No se generan reglas contradictorias entre documentos.

## Entrega esperada
Mostrar:
1. qué archivos fueron creados o modificados,
2. qué sección se agregó en cada uno,
3. el contenido final agregado.
