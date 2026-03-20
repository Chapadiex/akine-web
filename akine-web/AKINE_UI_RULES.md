# AKINE_UI_RULES — Secciones complementarias

Estas secciones completan `AKINE_UI_RULES.md` y deben tratarse con la misma jerarquía y obligatoriedad que el documento base.

---

## 24. Design tokens obligatorios

Los valores definidos en esta sección son la fuente de verdad para espaciado, tipografía, radio, sombras y z-index en toda la aplicación.

No se permite usar valores arbitrarios fuera de esta escala.
No se permite hardcodear valores en componentes individuales si el token correspondiente ya existe.

### 24.1 Espaciado

El sistema de espaciado base es de **8px**.

| Token        | Valor  | Uso típico                                         |
|--------------|--------|----------------------------------------------------|
| `space-1`    | 4px    | separación mínima entre elementos internos         |
| `space-2`    | 8px    | padding interno de inputs, gap entre íconos y texto|
| `space-3`    | 12px   | separación entre campos de formulario              |
| `space-4`    | 16px   | padding interno de cards, separación entre bloques |
| `space-5`    | 24px   | separación entre secciones dentro de una pantalla  |
| `space-6`    | 32px   | separación entre bloques principales               |
| `space-7`    | 48px   | margen superior de pantalla, separación de headers |
| `space-8`    | 64px   | uso excepcional, pantallas de landing o resumen    |

### 24.2 Tipografía

Fuente principal: **Plus Jakarta Sans** (fallback: system-ui, sans-serif).
Fuente monoespaciada para códigos, identificadores o datos técnicos: **JetBrains Mono**.

Import obligatorio en el proyecto (Google Fonts):
```
https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap
```

Pesos permitidos: `400` (regular), `500` (medium), `600` (semibold).
No usar `700` (bold) — resulta demasiado pesado en contexto clínico.

| Token        | Tamaño | Peso | Uso típico                                          |
|--------------|--------|------|-----------------------------------------------------|
| `text-xs`    | 11px   | 400  | captions, ayuda secundaria, metadatos, tags         |
| `text-sm`    | 12px   | 400  | helper text, mensajes de validación, subtítulo badge|
| `text-base`  | 13px   | 400  | texto de tabla, labels secundarios, body de card    |
| `text-md`    | 14px   | 400  | body principal, labels de formulario                |
| `text-label` | 15px   | 500  | subtítulos de sección, texto destacado, tab activo  |
| `text-lg`    | 17px   | 600  | título de modal, título de card, sección            |
| `text-xl`    | 20px   | 600  | título de pantalla                                  |
| `text-2xl`   | 22px   | 600  | título de sección principal o dashboard KPI         |

Interlineado base: `1.5` para body. `1.25` para títulos.
Letter-spacing: `0` para body. `0.06em–0.08em` solo para labels en mayúsculas (CAPS).

#### Regla de uso de pesos

- `400` para todo el contenido informativo y de lectura.
- `500` para labels de formulario, tabs, subtítulos de sección, nombres de entidad en tabla.
- `600` para títulos de pantalla, títulos de modal, valores KPI destacados.
- No usar `600` en body text corrido. No usar `400` en títulos principales.

#### Comparativa de alternativas (en orden de preferencia para AKINE)

| Fuente              | Carácter              | Cuándo elegirla                               |
|---------------------|-----------------------|-----------------------------------------------|
| **Plus Jakarta Sans** ✓ | geométrica, cálida   | opción principal recomendada                  |
| DM Sans             | neutra, funcional     | si se prefiere mayor neutralidad visual       |
| Nunito Sans         | redondeada, amigable  | si el producto apunta más al paciente final   |
| Roboto              | genérica              | no recomendada — muy asociada a apps Android  |
| Inter               | técnica, fría         | aceptable pero sin personalidad de marca      |

### 24.3 Border radius

| Token          | Valor  | Uso                                                    |
|----------------|--------|--------------------------------------------------------|
| `radius-xs`    | 4px    | badges pill con punto, chips de filtro muy compactos   |
| `radius-sm`    | 6px    | inputs, selects, botones, tooltips                     |
| `radius-md`    | 8px    | cards internas, paneles secundarios, dropdowns         |
| `radius-lg`    | 10px   | modales, drawers, cards principales de pantalla        |
| `radius-xl`    | 14px   | paneles de resumen, cards KPI grandes                  |
| `radius-full`  | 9999px | badges de estado (pill), avatares, indicadores circulares |

#### Regla de radio y borde superior de color en cards KPI

Las cards KPI usan `radius-xl` (14px) con un borde superior de 2.5px del color semántico del estado:
- Warning → `#F59E0B`
- Success → `#10B981`
- Info → `#3B82F6`
- Error → `#EF4444`

El borde lateral izquierdo de color (patrón anterior) queda deprecado. El borde superior es el patrón aprobado.

### 24.4 Sombras

| Token           | Valor CSS                                      | Uso                            |
|-----------------|------------------------------------------------|--------------------------------|
| `shadow-xs`     | `0 1px 2px rgba(0,0,0,0.06)`                   | inputs en foco, chips          |
| `shadow-sm`     | `0 2px 4px rgba(0,0,0,0.08)`                   | cards, dropdowns               |
| `shadow-md`     | `0 4px 12px rgba(0,0,0,0.10)`                  | modales, paneles flotantes     |
| `shadow-lg`     | `0 8px 24px rgba(0,0,0,0.14)`                  | drawers, popovers de contexto  |

### 24.5 Z-index

| Token           | Valor | Uso                            |
|-----------------|-------|--------------------------------|
| `z-base`        | 0     | contenido plano                |
| `z-sticky`      | 100   | headers sticky, toolbars fijas |
| `z-dropdown`    | 200   | menús desplegables             |
| `z-modal`       | 300   | modales y overlays             |
| `z-toast`       | 400   | notificaciones y toasts        |
| `z-tooltip`     | 500   | tooltips                       |

---

## 25. Paleta de colores y estados visuales

AKINE es un sistema de salud orientado a kinesiología y fisioterapia. La paleta prioriza legibilidad clínica, bajo nivel de fatiga visual y diferenciación clara de estados sin depender únicamente del color.

El color primario institucional es un **verde azulado oscuro** (`#1A6B5E`). Transmite calma, confianza y profesionalismo sin caer en el azul hospitalario genérico. Es el color ya presente en los botones primarios, tabs activos y acciones principales del sistema actual.

### 25.1 Colores base del sistema

| Token                  | Hex        | Uso principal                                              |
|------------------------|------------|------------------------------------------------------------|
| `color-primary`        | `#1A6B5E`  | botón primario, tab activo, link de acción, acento         |
| `color-primary-hover`  | `#155C51`  | hover sobre elementos primarios                            |
| `color-primary-light`  | `#E6F4F2`  | fondo de contexto primario, highlight sutil, badge activo  |
| `color-primary-text`   | `#0D4A40`  | texto sobre fondo `color-primary-light`                    |
| `color-neutral-900`    | `#0F172A`  | texto principal                                            |
| `color-neutral-600`    | `#475569`  | texto secundario, subtítulos, labels de tabla              |
| `color-neutral-400`    | `#94A3B8`  | texto deshabilitado, placeholder                           |
| `color-neutral-200`    | `#E2E8F0`  | bordes, divisores, separadores                             |
| `color-neutral-100`    | `#F1F5F9`  | fondo de cards secundarias, paneles                        |
| `color-neutral-50`     | `#F8FAFC`  | fondo de pantalla base                                     |
| `color-white`          | `#FFFFFF`  | fondo de modales, inputs, superficies elevadas             |

### 25.2 Colores semánticos de estado

| Token                   | Hex        | Fondo light | Uso principal                                         |
|-------------------------|------------|-------------|-------------------------------------------------------|
| `color-success`         | `#059669`  | `#ECFDF5`   | activo, aprobado, éxito, guardado correctamente       |
| `color-success-text`    | `#065F46`  | —           | texto sobre fondo success-light                       |
| `color-warning`         | `#D97706`  | `#FFFBEB`   | pendiente, sin cobertura, requiere atención           |
| `color-warning-text`    | `#92400E`  | —           | texto sobre fondo warning-light                       |
| `color-error`           | `#DC2626`  | `#FEF2F2`   | error, cancelado, rechazado, campo inválido           |
| `color-error-text`      | `#991B1B`  | —           | texto sobre fondo error-light                         |
| `color-info`            | `#2563EB`  | `#EFF6FF`   | en curso, informativo, contexto clínico neutro        |
| `color-info-text`       | `#1E40AF`  | —           | texto sobre fondo info-light                          |
| `color-blocked`         | `#4B5563`  | `#F3F4F6`   | bloqueado, sin permisos, finalizado, inactivo         |
| `color-blocked-text`    | `#374151`  | —           | texto sobre fondo blocked-light                       |

### 25.3 Regla de contraste obligatorio

Todos los textos sobre fondos coloreados deben superar ratio **4.5:1** (WCAG AA mínimo).

Verificaciones críticas:
- Texto `color-warning-text` (`#92400E`) sobre `#FFFBEB` → ratio ≈ 5.8:1 ✓
- Texto `color-success-text` (`#065F46`) sobre `#ECFDF5` → ratio ≈ 6.1:1 ✓
- Texto `color-primary-text` (`#0D4A40`) sobre `#E6F4F2` → ratio ≈ 7.2:1 ✓

No usar jamás texto genérico gris oscuro (`#333` o similar) sobre fondos de color semántico — siempre usar el token `-text` correspondiente del mismo ramp.

### 25.4 Regla de no dependencia del color

Ningún estado puede comunicarse exclusivamente por color. Todo badge de estado debe incluir:
- punto de color (dot) o ícono,
- texto del estado,
- y si aplica: tooltip o label extendido en hover.

### 25.5 Variables CSS obligatorias en Angular

Definir en `:root` del archivo de estilos global:

```css
:root {
  /* Primario */
  --color-primary:        #1A6B5E;
  --color-primary-hover:  #155C51;
  --color-primary-light:  #E6F4F2;
  --color-primary-text:   #0D4A40;

  /* Neutros */
  --color-neutral-900:    #0F172A;
  --color-neutral-600:    #475569;
  --color-neutral-400:    #94A3B8;
  --color-neutral-200:    #E2E8F0;
  --color-neutral-100:    #F1F5F9;
  --color-neutral-50:     #F8FAFC;
  --color-white:          #FFFFFF;

  /* Semánticos */
  --color-success:        #059669;
  --color-success-light:  #ECFDF5;
  --color-success-text:   #065F46;

  --color-warning:        #D97706;
  --color-warning-light:  #FFFBEB;
  --color-warning-text:   #92400E;

  --color-error:          #DC2626;
  --color-error-light:    #FEF2F2;
  --color-error-text:     #991B1B;

  --color-info:           #2563EB;
  --color-info-light:     #EFF6FF;
  --color-info-text:      #1E40AF;

  --color-blocked:        #4B5563;
  --color-blocked-light:  #F3F4F6;
  --color-blocked-text:   #374151;

  /* Tipografía */
  --font-primary: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

No hardcodear ninguno de estos valores en componentes individuales. Usar siempre la variable CSS correspondiente.

---

## 26. Estados de entidad: definición visual obligatoria

Todo estado debe representarse con badge pill compacto: fondo semántico + punto de color + texto.
No se permite representar estados solo con texto plano sin diferenciación visual.
No se permite inventar estados nuevos sin declararlos en esta sección.

### 26.1 Tabla de estados y representación

| Estado        | Badge texto   | Token fondo            | Token texto            | Color dot  | Ícono sugerido  |
|---------------|---------------|------------------------|------------------------|------------|-----------------|
| Activo        | Activo        | `color-success-light`  | `color-success-text`   | `#10B981`  | check-circle    |
| Inactivo      | Inactivo      | `color-blocked-light`  | `color-blocked-text`   | `#9CA3AF`  | minus-circle    |
| Pendiente     | Pendiente     | `color-warning-light`  | `color-warning-text`   | `#F59E0B`  | clock           |
| Sin cobertura | Sin cobertura | `color-warning-light`  | `color-warning-text`   | `#F59E0B`  | shield-off      |
| Aprobado      | Aprobado      | `color-success-light`  | `color-success-text`   | `#10B981`  | check           |
| En curso      | En curso      | `color-info-light`     | `color-info-text`      | `#3B82F6`  | refresh         |
| Finalizado    | Finalizado    | `color-blocked-light`  | `color-blocked-text`   | `#64748B`  | check-square    |
| Bloqueado     | Bloqueado     | `color-blocked-light`  | `color-blocked-text`   | `#6B7280`  | lock            |
| Sin permisos  | Sin permisos  | `color-blocked-light`  | `color-blocked-text`   | `#6B7280`  | shield-off      |
| Cancelado     | Cancelado     | `color-error-light`    | `color-error-text`     | `#EF4444`  | x-circle        |
| Vinculado     | Vinculado     | `color-primary-light`  | `color-primary-text`   | `#1A6B5E`  | link            |

### 26.2 Estructura CSS del badge de estado

```css
.badge-estado {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 9999px;       /* pill */
  font-family: var(--font-primary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-estado .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

### 26.3 Reglas de badges de estado

- El texto del badge debe estar en `font-size: 12px`, `font-weight: 500`.
- El punto (dot) debe ser de `6px × 6px`, circular.
- No usar badges de más de tres palabras. Si el estado es largo, abreviarlo o usar tooltip.
- No cambiar los colores de estado entre pantallas del mismo dominio.
- Los badges de estado no deben tener borde propio — solo fondo y texto.
- En tablas: el badge va en la columna Estado, nunca mezclado con la columna de identidad.

---

## 27. Loading states: cuándo y cómo

La carga debe comunicarse de forma apropiada según el tipo de contenido y el tiempo estimado de espera.

### 27.1 Criterios de selección

| Situación                                          | Patrón obligatorio   |
|----------------------------------------------------|----------------------|
| Carga inicial de tabla o listado                   | Skeleton             |
| Carga inicial de pantalla completa                 | Skeleton             |
| Acción puntual sobre un elemento (guardar, enviar) | Spinner inline       |
| Recarga parcial de sección                         | Skeleton parcial     |
| Carga en botón primario tras acción                | Spinner en botón     |
| Carga global bloqueante (transición entre rutas)   | Barra de progreso top|
| Upload de archivo                                  | Barra de progreso    |

### 27.2 Skeleton

- Usar bloques grises con animación de pulso (shimmer).
- Los skeletons deben replicar la estructura aproximada del contenido real: misma cantidad de filas, columnas y bloques.
- No mostrar skeletons de forma genérica sin relación con el contenido esperado.
- Color base del skeleton: `color-neutral-200`. Color del shimmer: `color-neutral-100`.
- No mezclar skeleton con spinner en la misma sección simultáneamente.

### 27.3 Spinner

- Usar solo para acciones puntuales o cargas de duración breve y conocida.
- El spinner debe ser pequeño y proporcional al contexto: no usar spinner grande en tabla.
- Cuando el spinner está en un botón, deshabilitar el botón durante la carga.
- Color: `color-primary` sobre fondo claro. `color-white` sobre fondo primario.

### 27.4 Barra de progreso

- Usar para uploads o procesos con progreso medible.
- Mostrar porcentaje numérico cuando sea posible.
- No usar barra indeterminada si hay progreso real disponible.

### 27.5 Reglas generales de loading

- No dejar secciones en blanco sin indicador de carga.
- No dejar botones activos mientras la acción está en curso.
- No mostrar datos parciales mezclados con skeleton.
- Respetar el tiempo máximo de espera percibido: si una carga supera 3 segundos, debe haber feedback visible.

---

## 28. Notificaciones, toasts y alertas

### 28.1 Cuándo usar cada patrón

| Situación                                                  | Patrón             |
|------------------------------------------------------------|--------------------|
| Confirmación de acción exitosa (guardar, eliminar, enviar) | Toast              |
| Error de acción puntual recuperable                        | Toast de error     |
| Error de validación de formulario                          | Mensaje inline     |
| Alerta del sistema persistente o con acción requerida      | Banner             |
| Información contextual no crítica dentro de pantalla       | Alert inline       |
| Confirmación destructiva (eliminar, descartar)             | Modal de confirmación |

### 28.2 Toasts

- Posición: esquina inferior derecha en desktop, inferior centrado en mobile.
- Duración: 4 segundos para éxito e información. 6 segundos para error.
- El toast de error no debe cerrarse automáticamente si no hay acción alternativa visible.
- No apilar más de 3 toasts simultáneos.
- Incluir ícono semántico acorde al estado.
- No usar toasts para errores críticos que requieren acción del usuario: usar modal o banner.
- El toast debe poder cerrarse manualmente con botón `X`.

### 28.3 Banners

- Usar para avisos del sistema persistentes o que requieren acción.
- Posición: debajo del header de la pantalla, fuera del contenido principal.
- Incluir siempre: texto explicativo + acción si aplica + posibilidad de cerrar si no es bloqueante.
- No acumular más de un banner visible al mismo tiempo salvo necesidad crítica.
- No usar banners decorativos sin información real.

### 28.4 Alertas inline

- Usar dentro del contexto de un formulario o sección puntual.
- No reemplazar mensajes de validación de campo con alertas inline genéricas.
- Deben ser compactas y no romper el flujo de lectura del formulario.

### 28.5 Textos de toasts y alertas

- El mensaje debe explicar qué pasó en términos del dominio, no del sistema.
- Correcto: "El turno fue guardado correctamente."
- Incorrecto: "Success" / "OK" / "Error 500".
- Si hay un error, el mensaje debe orientar al usuario sobre qué puede hacer.
- No usar jerga técnica en mensajes visibles al usuario final.

---

## 29. Inventario de patrones aprobados

Esta sección lista los patrones visuales y de interacción que están aprobados como estándar en AKINE.
Cualquier pantalla nueva o modificada debe priorizar estos patrones antes de crear uno nuevo.

### 29.1 Estructura de pantalla estándar

```
┌─────────────────────────────────────────┐
│ Header: título + subtítulo + acciones   │
├─────────────────────────────────────────┤
│ Filtros / buscador (ocultos por defecto)│
├─────────────────────────────────────────┤
│ Contenido principal (tabla / cards)     │
├─────────────────────────────────────────┤
│ Paginación                              │
└─────────────────────────────────────────┘
```

### 29.2 Patrones de formulario aprobados

- **Formulario en modal**: para carga o edición puntual de una entidad. Campos en una o dos columnas. Acciones al pie: `Cancelar` + `Guardar`.
- **Formulario en pantalla completa con secciones**: para entidades complejas con múltiples bloques (datos del paciente, datos clínicos, configuración). Usar secciones colapsables o tabs si hay más de 6 bloques.
- **Formulario con stepper**: solo para flujos con pasos secuenciales obligatorios y donde el orden importa.

### 29.3 Patrones de tabla aprobados

- Columnas con orden: identidad → atributos clave → estado → acciones.
- Acciones por fila: máximo 2 acciones directas visibles. El resto en menú contextual (`...`).
- Paginación estándar: navegación por páginas con selector de cantidad de registros.
- Sin datos: empty state con ícono, mensaje y acción principal si aplica.

### 29.4 Patrones de acción aprobados

- **Botón primario**: una sola acción principal por pantalla o modal.
- **Botón secundario**: acción alternativa (cancelar, volver, exportar).
- **Botón ghost o link**: acciones de menor jerarquía.
- **Menú de acciones por fila**: para más de 2 acciones sobre una entidad de tabla.
- **FAB (Floating Action Button)**: no aprobado en AKINE. No usar.

### 29.5 Patrones de modal aprobados

- **Modal de carga/edición**: con foco en primer campo, sin cierre por backdrop, con confirmación si hay cambios.
- **Modal de confirmación destructiva**: solo título + mensaje + `Cancelar` + acción destructiva.
- **Modal de detalle/lectura**: puede cerrarse por backdrop. Sin acciones de edición inline.

---

## 30. Corrección de sección 22 (Regla final)

La sección 22 del documento base está incompleta. El párrafo correcto es:

---

### 22. Regla final

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

entonces la propuesta **no cumple con AKINE y debe corregirse antes de implementarse**.

No se acepta implementar y corregir después. La corrección es previa a cualquier merge, deploy o aplicación en el sistema.

---

## 31. Checklist de revisión obligatoria pre-implementación

Este checklist debe completarse antes de cualquier cambio de frontend.
No es opcional. No se puede saltear argumentando urgencia o cambio menor.

### 31.1 Estructura y consistencia

- [ ] Reutilicé un patrón existente aprobado en AKINE (sección 29).
- [ ] La pantalla mantiene la jerarquía estándar: header → filtros → contenido → paginación.
- [ ] No inventé un patrón nuevo sin declararlo y justificarlo.
- [ ] Las pantallas equivalentes se ven equivalentes.

### 31.2 Formularios y campos

- [ ] Los campos están agrupados por lógica de dominio real.
- [ ] Solo marqué como obligatorio lo que es funcionalmente obligatorio.
- [ ] No repito datos ya disponibles en el flujo.
- [ ] Cada input valida tipo, formato, longitud y rango cuando aplica.
- [ ] Los mensajes de error son claros, accionables y en términos del dominio.

### 31.3 Estados visuales

- [ ] Contemplé los 7 estados: carga, vacío, error, éxito, bloqueo, sin permisos, sin resultados.
- [ ] Los estados usan los tokens y badges definidos en la sección 26.
- [ ] No dependo solo del color para indicar estado.

### 31.4 Modales

- [ ] El modal tiene foco automático en el primer campo útil.
- [ ] El modal con formulario no se cierra con click fuera del backdrop.
- [ ] Si hay cambios sin guardar, hay confirmación de descarte antes de cerrar.
- [ ] Las acciones del modal son claras: `Cancelar` y `Guardar` (o equivalentes).

### 31.5 Responsive

- [ ] Probé el cambio en desktop (≥1280px).
- [ ] Probé el cambio en tablet (768px–1279px).
- [ ] Probé el cambio en mobile (≤767px).
- [ ] No oculté información crítica en mobile sin alternativa.

### 31.6 Accesibilidad mínima

- [ ] Todos los inputs tienen label asociado correctamente.
- [ ] Los mensajes de error están vinculados al campo.
- [ ] El orden de tabulación es lógico.
- [ ] El foco es visible en todos los controles.
- [ ] El contraste supera 4.5:1 en textos sobre fondos coloreados.

### 31.7 Loading y notificaciones

- [ ] Definí el patrón de carga correcto (skeleton, spinner o barra).
- [ ] Los botones se deshabilitan durante acciones en curso.
- [ ] Los toasts y alertas usan el patrón definido en la sección 28.
- [ ] Los mensajes de feedback están en términos del dominio, no del sistema.

### 31.8 Tokens de diseño

- [ ] Usé tokens de espaciado definidos en la sección 24.
- [ ] Usé tokens de color definidos en la sección 25.
- [ ] No hardcodeé valores arbitrarios de px, color o tipografía.

---
