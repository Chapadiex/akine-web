---
agent:
  name: "AKINE-Frontend-Agent"
  version: "1.0.0"
  purpose: "Reglas especificas para Angular 20 en akine-web."
  temperature: 0.2
  scope: "frontend"
  target_path: "akine-web"
---

# AGENTS.md - Frontend Angular 20

## 1. Alcance
Este archivo aplica solo al proyecto frontend `akine-web`.

Complementa al `AGENTS.md` de la raiz. Si hay conflicto, la seguridad global de la raiz manda.

## 2. Stack y lineamientos base
- Angular 20 standalone
- TypeScript estricto
- arquitectura por features
- componentes pequenos y cohesionados
- servicios por feature
- interceptores para auth y errores globales

## 3. Estructura esperada
```text
src/app/
  core/
  shared/
  features/
```

Cada feature debe mantener separacion clara entre:
- pages
- components
- services
- models
- store o state local si aplica

## 4. Reglas de implementacion
### 4.1 Componentes
- preferir componentes standalone
- evitar componentes gigantes
- usar `ChangeDetectionStrategy.OnPush` en componentes presentacionales
- evitar logica pesada en templates
- no duplicar formularios o validaciones si pueden compartirse

### 4.2 Estado y reactividad
- preferir `signals` para estado simple o mediano
- usar RxJS cuando el flujo realmente lo requiera
- no mezclar patrones sin necesidad
- evitar suscripciones manuales innecesarias

### 4.3 Tipado
- prohibido `any` salvo caso muy justificado
- definir interfaces o tipos para DTOs, respuestas HTTP y modelos de vista
- no pasar objetos crudos por toda la app sin contrato claro

### 4.4 Servicios HTTP
- un servicio por feature o dominio coherente
- centralizar acceso HTTP y no llamar API directo desde componentes
- manejar errores de forma consistente
- si cambia un contrato backend, actualizar tipos, adapters y pantallas afectadas

## 5. Seguridad frontend
- prohibido usar `[innerHTML]` sin sanitizacion explicita
- no exponer tokens, claims o datos sensibles en logs del navegador
- no persistir informacion clinica sensible sin razon funcional clara
- validar UX y permisos en frontend, pero recordar que la seguridad real vive en backend

## 6. Formularios
- preferir Reactive Forms
- validaciones sincronizadas con reglas backend
- mensajes de error claros y sin filtrar detalles sensibles
- no mandar payloads con campos basura o inconsistentes

## 7. UI y UX
- mantener consistencia visual
- priorizar claridad en formularios, turnos, historia clinica y caja
- no introducir librerias UI nuevas sin pedido explicito
- responsive obligatorio para desktop, tablet y movil

## 7.1 Estandar global de tablas
- toda tabla actual y futura debe heredar un mismo sistema reutilizable de layout
- definir tipos base de columna como minimo:
  - `text`
  - `textShort`
  - `numeric`
  - `status`
  - `actions`
- cada tipo debe resolver por defecto:
  - alineacion
  - ancho esperado
  - comportamiento responsivo
  - padding
  - jerarquia visual
- reglas obligatorias de alineacion:
  - texto descriptivo y nombres -> izquierda
  - valores numericos, importes y porcentajes -> derecha
  - fechas -> criterio consistente por patron, preferentemente izquierda si son descriptivas o centradas si son dato corto
  - estados -> consistentes y contenidos
  - acciones -> compactas y acotadas
- columnas descriptivas deben ocupar el espacio flexible restante
- columnas numericas, de estado y acciones deben mantenerse acotadas y previsibles
- encabezados deben respetar la misma alineacion que sus celdas
- los estados visuales dentro de tablas deben ir en negrita
- aplica a `Activo`, `Inactivo`, `Pendiente`, `Suspendido`, `Cancelado` y equivalentes
- la negrita debe reforzar lectura y jerarquia sin cambiar el tamano general del componente
- mantener este criterio en todas las tablas actuales y futuras
- la implementacion debe apoyarse en infraestructura compartida: utilidades globales, configuracion compartida de columnas, componente base de tabla o equivalente
- evitar ajustes manuales tabla por tabla cuando la regla corresponde al estandar global

## 8. Testing
Cambios relevantes deben incluir cuando aplique:
- pruebas de componentes
- pruebas de servicios
- pruebas de validacion de formularios
- pruebas basicas de flujos criticos

## 9. No hacer
Queda prohibido sin pedido explicito:
- migrar de estrategia de estado por capricho
- meter librerias pesadas para resolver algo simple
- cambiar estructura global del proyecto
- tocar auth global sin revisar impacto

## 10. Verificacion minima
Ejecutar segun corresponda:

```bash
npm ci
npm run lint
npm run test:ci
npm run build
```

## 11. Formato de respuesta del agente en frontend
Siempre indicar:
- que modulo o feature toca
- que archivos cambia
- impacto visual o funcional
- como probar manualmente
- riesgos de UX, validacion o compatibilidad
