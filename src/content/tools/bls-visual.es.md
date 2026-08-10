---
name: "Estimulación Bilateral Visual"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Punto en movimiento horizontal para la estimulación bilateral mediante movimientos oculares. Velocidad, tamaño y color ajustables. Usa la pantalla completa para la entrega en sesión."
componentName: "BLSVisual"
citations:
  - label: "Shapiro, F. (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed. Guilford Press."
  - label: "EMDRIA. Standard EMDR Therapy Protocol — estándar de formación organizacional. Ver también: Luber, M. (Ed.) (2016). A Guide to the Standard EMDR Therapy Protocols. Springer."
    url: "https://www.emdria.org"
warnings:
  - "Advertencia de epilepsia fotosensible: esta herramienta utiliza movimiento horizontal sostenido."
  - "No se recomienda para uso en casa sin supervisión clínica."
locale: es
---

## Qué es esto

Un estímulo visual en movimiento horizontal para la estimulación bilateral mediante movimientos oculares (EMB) durante la desensibilización en Fase 4 o la instalación en Fase 5. El punto se mueve de lado a lado a una velocidad configurable.

## Cuándo usarlo

- **Fase 4 — Desensibilización:** Entre chequeos, mientras el consultante sigue el punto con los ojos.
- **Fase 5 — Instalación:** Para fortalecer la cognición positiva.

## Notas clínicas

La guía publicada de Shapiro describe la velocidad como "tan rápido como el consultante pueda seguir cómodamente" en lugar de un valor fijo en Hz. El valor predeterminado de 1,0 Hz (un ciclo completo izquierda-derecha por segundo) es una estimación intermedia razonable de los materiales de formación en EMDR; ajústalo libremente según la tolerancia y la respuesta del consultante. Las series de aproximadamente 24 pases son un punto de partida comúnmente enseñado; series más cortas o más largas son apropiadas según la sesión. El movimiento más rápido se usa generalmente para la desensibilización, el más lento para la instalación. Usa el modo de pantalla completa para eliminar las distracciones visuales y dar al consultante un seguimiento limpio.

## Parámetros predeterminados

- **Velocidad:** 1,0 Hz (un ciclo completo izquierda-derecha por segundo)
- **Duración de la serie:** 24 pases
- **Trayectoria:** horizontal (también están disponibles las trayectorias de infinito, arco, diagonal y onda)
- **Suavizado:** coseno (desacelera al entrar y salir de cada borde; también están disponibles lineal y smootherstep)
- **Forma del objetivo:** círculo (también están disponibles anillo, brillo suave, estrella y mariposa), 48 px, con resplandor y estela ajustables
- **Color:** objetivo blanco cálido sobre fondo negro, además de cinco paletas predefinidas (predeterminada, alto contraste, baja estimulación, cálida, fría)
- **Fundido cruzado:** desactivado — cuando se activa, el objetivo se funde entre los dos extremos en lugar de trasladarse, para el uso con movimiento reducido
