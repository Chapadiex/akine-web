# AKINE_UI_RULES.md

## 1. Propósito

`AKINE_UI_RULES.md` es la guía visual y de experiencia de usuario transversal de AKINE.

Su objetivo es:
- mantener consistencia entre pantallas,
- evitar rediseños improvisados,
- reducir peso visual y carga cognitiva,
- mejorar la velocidad de carga operativa,
- unificar criterios de formularios, tablas, modales, headers, tabs, steppers, filtros, estados, validaciones y responsive.

Estas reglas son obligatorias para cualquier cambio de frontend, UX/UI o ajuste visual del producto.

---

## 2. Alcance obligatorio

Estas reglas aplican a cualquier intervención sobre:
- pantallas,
- formularios,
- campos,
- tablas,
- listados,
- modales,
- drawers,
- headers,
- tabs,
- steppers,
- KPIs,
- cards,
- badges,
- estados,
- buscadores,
- filtros,
- paginación,
- acciones por fila,
- toolbars,
- uploads de archivos,
- empty states,
- banners,
- alertas,
- confirmaciones,
- layouts responsive.

No se permite excluir un cambio de estas reglas argumentando que “solo se tocó una parte chica”.

---

## 3. Fuente de verdad visual y prioridad

`AKINE_UI_RULES.md` es la fuente de verdad visual del producto.

### Orden de prioridad para decisiones visuales
1. requerimiento funcional explícito aprobado,
2. `AKINE_UI_RULES.md`,
3. patrón existente aprobado en AKINE,
4. criterio del agente o desarrollador.

No se permite saltear este orden.

No se permite justificar un cambio visual solo por preferencia estética personal.

---

## 4. Principios obligatorios de diseño en AKINE

### 4.1 Consistencia antes que creatividad
- No improvisar rediseños.
- No crear patrones nuevos si ya existe uno aprobado.
- No reinterpretar una pantalla completa si el problema es puntual.
- No inventar nuevas distribuciones cuando una ya funciona en otra parte del sistema.

### 4.2 Reducción de carga cognitiva
- Mostrar primero lo más importante.
- Lo secundario debe quedar resumido, oculto o detrás de una acción explícita.
- No abrir pantallas con demasiados bloques compitiendo entre sí.
- No mezclar datos operativos, configuración y contexto clínico en un mismo bloque si eso vuelve pesada la lectura.

### 4.3 Compacidad visual
- No agrandar componentes para “dar claridad”.
- La claridad debe lograrse con mejor jerarquía, agrupación, espaciado y texto, no con botones gigantes o bloques sobredimensionados.
- Priorizar controles compactos y proporcionales al contexto.

### 4.4 Reutilización de patrones
- Si ya existe una solución aprobada para headers, tablas, acciones, badges, filtros, formularios o modales, debe reutilizarse.
- Las pantallas equivalentes deben verse equivalentes.

---

## 5. Jerarquía visual obligatoria

Toda pantalla debe tener una jerarquía clara y estable.

### Regla general
- Primero: contexto y acción principal.
- Después: contenido principal editable o consultable.
- Luego: contenido secundario, configuraciones o detalles avanzados.

### Reglas específicas
- El título y subtítulo deben explicar la pantalla sin ruido visual.
- Las acciones primarias deben ser visibles pero no invasivas.
- Las acciones secundarias no deben competir con la acción principal.
- Los estados deben verse claros pero no robar protagonismo innecesario.
- No abrir una pantalla con múltiples banners, chips, cards y botones grandes al mismo tiempo.

---

## 6. Reglas de headers y cabeceras

### Cabecera estándar
Toda pantalla debe tender a una cabecera compacta y consistente con:
- título,
- subtítulo o descripción corta,
- acciones a la derecha si aplica,
- icono o botón de filtro cuando corresponda.

### Reglas
- No usar cabeceras gigantes.
- No repetir información en header y cuerpo si no aporta valor.
- No usar demasiados badges en cabecera.
- Si hay estado relevante, debe presentarse de forma compacta.
- Si existen pantallas de resumen y edición del mismo dominio, sus cabeceras deben mantener la misma lógica visual base.

---

## 7. Formularios: reglas obligatorias

## 7.1 Formularios largos
- No mostrar todos los campos al mismo tiempo si no es necesario para completar la tarea principal.
- Aplicar progressive disclosure.
- Dividir formularios por bloques lógicos del dominio, no por capricho visual.
- No crear formularios “sábana”.
- Lo indispensable debe estar primero.
- Lo opcional o avanzado debe ir después o colapsado.

## 7.2 Agrupación
Agrupar campos por lógica real:
- identidad,
- contacto,
- ubicación,
- configuración,
- datos administrativos,
- datos clínicos,
- datos de contexto,
- datos opcionales.

No mezclar grupos incompatibles dentro del mismo bloque.

## 7.3 Obligatoriedad
- Marcar solo lo realmente obligatorio.
- No convertir campos opcionales en pseudo-obligatorios por mal diseño.
- Lo obligatorio debe responder a necesidad funcional real.

## 7.4 Ayuda y texto explicativo
- No usar placeholders largos como explicación de negocio.
- El label debe ser claro por sí mismo.
- La ayuda adicional debe ser breve.
- La explicación extensa debe ir debajo del campo o en ayuda contextual, no dentro del input.

## 7.5 No duplicación
- No volver a pedir información ya disponible en el flujo o dominio.
- Si un dato ya existe en paciente, profesional, consultorio, cobertura, turno, sesión o caso, debe reutilizarse, resumirse o mostrarse como contexto antes que volver a cargarse.
- No repetir el mismo dato en múltiples bloques salvo justificación funcional real.

---

## 8. Reglas obligatorias para campos e inputs

## 8.1 Validación por tipo de dato
Todo input debe validar el tipo de dato esperado.

### Esto es obligatorio
- validar formato,
- validar longitud,
- validar obligatoriedad,
- validar tipo,
- validar rango si aplica,
- validar consistencia de negocio si aplica.

### Ejemplos
- email: formato de email válido,
- teléfono: formato esperado,
- documento: solo caracteres permitidos y longitud esperada,
- CUIT/CUIL: estructura y longitud correctas,
- fecha: fecha válida y rango permitido,
- números: solo valores numéricos si corresponde,
- importes: formato decimal correcto,
- porcentajes: rango válido,
- campos alfabéticos: no aceptar caracteres que no correspondan si el dominio no los permite.

## 8.2 Validación temprana pero no agresiva
- Validar mientras el usuario interactúa cuando sea útil.
- No castigar al usuario mostrando error en rojo antes de que haya tenido oportunidad de completar el dato.
- Priorizar validación en blur, cambio relevante o submit, según el caso.
- Mostrar error claro y accionable.

## 8.3 Input adecuado al dato
- No usar input genérico si corresponde otro control.
- No usar select largo si corresponde búsqueda o autocomplete.
- No usar toggle para decisiones complejas.
- No usar radio si hay demasiadas opciones.
- No usar textarea si alcanza con input corto.
- No usar date picker si el contexto requiere una entrada más rápida y controlada.

## 8.4 Restricción de entrada
Cuando el dominio lo justifique:
- limitar caracteres inválidos,
- aplicar máscara,
- aplicar normalización,
- impedir tipeo incorrecto desde el origen cuando sea razonable.

Ejemplo:
- no permitir letras en campos puramente numéricos,
- no permitir caracteres inválidos en identificadores,
- normalizar espacios,
- evitar dobles espacios o contenido basura.

## 8.5 Consistencia entre frontend y backend
- La validación de UI no reemplaza la validación de backend.
- Debe existir coherencia entre ambas.
- La UI debe prevenir errores obvios.
- El backend debe garantizar integridad final.

---

## 9. Reglas de foco y posicionamiento del cursor

Estas reglas son obligatorias para mejorar velocidad operativa.

## 9.1 Apertura de modales desde acción de alta, carga o edición
Si una acción abre un modal para:
- crear,
- cargar,
- editar,
- completar,
- adjuntar,
- corregir,

el foco debe posicionarse automáticamente en el primer campo útil editable del flujo.

### Regla general
- El usuario no debe tener que hacer un clic extra en el primer campo principal.
- El cursor debe quedar listo para escribir donde tiene sentido empezar.

### Aplicación
- modal de alta: foco en el primer campo principal de carga,
- modal de edición: foco en el primer campo editable relevante,
- modal de upload: foco en el control principal de carga o en el primer paso accionable.

### Excepciones válidas
No aplicar auto-focus ciego cuando:
- el modal es solo de confirmación,
- la primera acción debe ser elegir una opción previa,
- hay un componente inicial que no admite foco útil,
- el foco automático rompería accesibilidad o navegación.

## 9.2 Cambio entre botón y modal
Cuando un usuario pasa de una acción visible a un modal:
- debe sentirse continuidad,
- el foco debe quedar dentro del modal,
- no debe perderse el contexto,
- el usuario debe poder empezar a operar de inmediato.

## 9.3 Cierre de modal
Al cerrar un modal:
- el foco debe volver al elemento que abrió el modal, o
- a una referencia lógica equivalente si el elemento original ya no existe.

## 9.4 Navegación por teclado
- El orden de tabulación debe ser lógico.
- No debe haber saltos extraños.
- El usuario debe poder completar formularios y modales sin depender del mouse.

---

## 10. Tabs, steppers, accordions y patrones de secciones

## 10.1 Tabs
Usar tabs solo si:
- las secciones son hermanas,
- el usuario cambia entre ellas con frecuencia,
- no necesita verlas simultáneamente.

No usar tabs para esconder desorden.

## 10.2 Stepper
Usar stepper solo si existe secuencia real de pasos.

No usar stepper decorativo.

No convertir stepper en botones grandes.

## 10.3 Accordion / details
Usar para:
- ayuda,
- información secundaria,
- configuración avanzada,
- detalles no críticos.

No ocultar dentro de accordions lo que la mayoría necesita para completar la tarea.

## 10.4 Regla estricta
- No convertir tabs o steppers en bloques grandes.
- No reemplazar un patrón aprobado por uno más pesado sin motivo funcional fuerte.

---

## 11. Modales, drawers y paneles

### 11.1 Cuándo usar modal
Usar modal para tareas:
- acotadas,
- rápidas,
- enfocadas,
- de edición puntual,
- de confirmación,
- de carga breve.

### 11.2 Cuándo no usar modal
No usar modal para:
- flujos largos,
- formularios gigantes,
- tareas complejas con múltiples bloques pesados,
- procesos donde el usuario necesita mucho contexto simultáneo.

### 11.3 Reglas
- El modal debe tener un objetivo claro.
- Debe abrir con foco correcto.
- Debe tener acciones claras.
- No debe tener ruido visual innecesario.
- No debe tener demasiadas acciones de igual peso.

### 11.4 Drawers
Usar solo cuando el patrón del sistema ya lo justifique y no rompa consistencia.

Si el sistema usa modal como patrón principal para edición puntual, no cambiar a drawer por gusto.

---

## 12. Tablas, listados y grillas

## 12.1 Reglas generales
- Las tablas deben priorizar lectura rápida.
- No sobrecargar con demasiadas columnas visibles.
- No repetir acciones gigantes dentro de cada fila.
- Las acciones por fila deben ser compactas y consistentes.

## 12.2 Alineación
- texto a la izquierda,
- números a la derecha,
- estados con tratamiento consistente,
- fechas con formato uniforme.

## 12.3 Estados
- los estados deben ser visibles y consistentes,
- cuando corresponda pueden ir en negrita,
- no depender solo del color.

## 12.4 Columnas
- Mantener orden lógico.
- Primero identidad.
- Después atributos clave.
- Luego estado.
- Finalmente acciones.

## 12.5 Acciones
- No llenar la tabla de botones.
- Priorizar menú de acciones o acciones compactas cuando haga falta.
- Mantener mismo patrón entre tablas equivalentes.

---

## 13. Filtros y búsquedas

## 13.1 Regla obligatoria
Los filtros avanzados deben estar ocultos detrás de un botón o acción de filtro.

No deben mostrarse visibles por defecto salvo necesidad funcional crítica y explícita.

## 13.2 Reglas
- El buscador principal puede estar visible si es de uso frecuente.
- Los filtros secundarios o avanzados deben desplegarse bajo demanda.
- No saturar la cabecera con filtros visibles.
- El icono y acción de filtro deben ser consistentes en toda la app.

## 13.3 Comportamiento
- Al aplicar filtros, volver a la primera página.
- Al limpiar filtros, la pantalla debe recuperarse de forma clara.
- El usuario debe entender fácilmente si hay filtros activos.

---

## 14. Estados obligatorios del sistema

Toda pantalla o componente debe contemplar, cuando corresponda:
- carga,
- vacío,
- error,
- éxito,
- bloqueo,
- sin permisos,
- sin resultados.

## Reglas
- No dejar sectores vacíos sin explicación.
- No dejar botones activos si el usuario no puede completar la acción.
- No mostrar errores genéricos sin guía.
- El mensaje debe explicar qué pasó y qué puede hacer el usuario.

---

## 15. Upload de archivos

## 15.1 Regla general
La carga de archivos debe ser simple y clara.

## 15.2 Obligatorio
- indicar tipos permitidos,
- indicar límite si aplica,
- validar formato,
- validar tamaño si aplica,
- mostrar estado de carga,
- mostrar error comprensible si falla,
- permitir reemplazo o eliminación si el flujo lo requiere.

## 15.3 Foco y continuidad
Si el usuario abre un modal de carga de archivos:
- el foco debe quedar en el control principal de carga o en el primer paso lógico útil.

---

## 16. Responsive obligatorio

Ningún cambio visual se considera completo si solo funciona bien en desktop.

## Debe contemplar
- desktop,
- tablet,
- mobile.

## Reglas
- Mantener jerarquía visual.
- Mantener accesibilidad de acciones.
- Mantener legibilidad.
- No romper flujos.
- No ocultar información crítica solo porque no entra.
- Reordenar con lógica, no simplemente apilar sin criterio.

---

## 17. Accesibilidad mínima obligatoria

Toda UI debe cumplir como mínimo con:
- foco visible,
- labels claros,
- asociación correcta entre label y campo,
- mensajes de error vinculados al campo,
- navegación razonable por teclado,
- contraste suficiente,
- no depender solo del color para indicar estado,
- targets táctiles razonables en mobile.

No se permite una UI “linda” pero difícil de operar.

---

## 18. Espaciado y consistencia estructural

## 18.1 Regla general
El espaciado debe ser consistente en toda la aplicación.

## Obligatorio
- usar sistema fijo de spacing,
- mantener mismas distancias entre header, subtítulo, acciones y contenido en pantallas equivalentes,
- no ajustar márgenes manualmente por pantalla sin criterio global,
- no crear diferencias arbitrarias entre resumen, edición y modal.

## 18.2 Equivalencia
Si dos pantallas representan el mismo patrón:
- deben compartir estructura base,
- deben compartir jerarquía,
- deben compartir lógica de acciones,
- deben compartir tratamiento visual de estados y separaciones.

---

## 19. Regla de no burocracia visual

AKINE no debe obligar al usuario a atravesar ruido visual para completar una tarea.

### Esto implica
- no repetir contexto en exceso,
- no mostrar bloques decorativos sin función,
- no pedir más datos de los necesarios para avanzar,
- no mezclar información crítica con accesorios visuales,
- no inflar la pantalla con cards, chips, banners o badges innecesarios.

---

## 20. Respuesta previa obligatoria antes de implementar cambios visuales

Antes de tocar cualquier cambio visual, el agente o desarrollador debe indicar explícitamente:

1. qué patrón existente va a reutilizar,
2. en qué pantalla o módulo ya existe ese patrón,
3. qué va a simplificar,
4. qué va a eliminar,
5. cómo va a reducir peso visual,
6. cómo va a mantener consistencia con otras pantallas,
7. qué estados visuales contempla,
8. cómo se comportará en desktop, tablet y mobile,
9. dónde quedará el foco inicial si abre un modal,
10. cómo validará los tipos de datos en los inputs involucrados.

No se debe implementar primero y justificar después.

---

## 21. Excepciones

Cualquier excepción a estas reglas:
- debe justificarse por necesidad funcional real,
- debe declararse antes de implementarse,
- no puede basarse en preferencia estética individual,
- no puede romper coherencia global del producto sin aprobación explícita.

---

## 22. Regla final

Si una propuesta:
- agrega ruido,
- agranda componentes innecesariamente,
- duplica datos,
- rompe consistencia,
- complica formularios,
- empeora la carga operativa,
- no contempla foco,
- no valida correctamente los datos,
- no resuelve estados,
- o no respeta responsive,

## 23. Regla de cierre de modales con carga o edición

Los modales que contengan formularios de carga, edición, corrección o configuración no deben cerrarse al hacer click fuera del modal.

### Objetivo
Evitar pérdida accidental de datos, interrupciones involuntarias del flujo y cierres no intencionales en tareas transaccionales.

### Reglas obligatorias
- No permitir cierre por click en el backdrop en formularios con datos editables.
- El modal solo debe poder cerrarse por acciones explícitas del usuario, como `Cancelar`, `Cerrar` (`X`) o una acción exitosa de `Guardar`.
- Si el modal no tiene cambios, puede cerrarse con acciones explícitas sin confirmación adicional.
- Si el modal tiene cambios sin guardar, no debe cerrarse directamente.
- Si el usuario intenta salir y existen cambios sin guardar, mostrar una confirmación de descarte antes de cerrar.
- No perder datos cargados por interacciones accidentales fuera del modal.
- La tecla `ESC` debe seguir la misma lógica de protección de cambios.
- El cierre por `Cancelar`, `Cerrar` (`X`) o `ESC` no debe descartar datos silenciosamente si hubo edición previa.

### Comportamiento esperado
- Click fuera del modal: no cerrar.
- `Cancelar` o `Cerrar` (`X`) sin cambios: cerrar.
- `Cancelar`, `Cerrar` (`X`) o `ESC` con cambios: pedir confirmación.
- `Guardar` exitoso: cerrar.
- `Guardar` con error de validación o error de persistencia: no cerrar.

### Confirmación sugerida al intentar salir con cambios
**Título:** `¿Descartar cambios?`  
**Mensaje:** `Hay datos cargados que todavía no fueron guardados.`  
**Acciones:**
- `Seguir editando`
- `Descartar`

### Alcance
Esta regla aplica a cualquier modal de:
- alta,
- edición,
- corrección,
- configuración,
- carga de datos,
- carga de archivos,
- asignación o vinculación,
- formularios multiestado o multisección.

### Excepción
Solo pueden cerrarse por click fuera los modales informativos, de lectura, ayuda o confirmación simple, siempre que no contengan datos editables ni riesgo de pérdida de trabajo.

entonces la propuesta no cumple con AKINE y debe corregirse antes de implementarse.

---