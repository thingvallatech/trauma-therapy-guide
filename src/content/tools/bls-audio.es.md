---
name: "Estimulación Bilateral Auditiva"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Tonos estéreo alternantes izquierda/derecha para EMB auditiva. Requiere auriculares. Velocidad, tono y volumen ajustables."
componentName: "BLSAudio"
citations:
  - label: "Shapiro, F. (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed. Guilford Press."
warnings:
  - "Se requieren auriculares — la separación estéreo es lo que hace que esto sea bilateral."
  - "No se recomienda para uso en casa sin supervisión clínica."
locale: es
---

## Qué es esto

Tonos estéreo alternantes izquierda/derecha entregados a través de la Web Audio API. Se usa cuando los movimientos oculares están contraindicados o cuando el consultante prefiere la EMB auditiva.

## Cuándo usarlo

- **Cuando los movimientos oculares no son tolerados** (p. ej., consultantes muy activados, fotofobia, discapacidad visual).
- **Como modalidad alternativa** durante sesiones largas de desensibilización para reducir la fatiga ocular.

## Notas clínicas

La profundidad del paneo estéreo es ajustable en lugar de fija — el valor predeterminado es una separación del 85% izquierda/derecha (no totalmente izquierda/derecha), ya que algunos consultantes encuentran fatigante la separación completa durante una sesión larga. La voz (tono, campanilla, caja china, marimba, campana, cuerda), el tono y el volumen también son ajustables; la frecuencia predeterminada es 440 Hz. Un fondo ambiental opcional (ruido, zumbido o una capa binaural) puede sonar debajo del tono bilateral. Para iniciar la herramienta se requiere un gesto del usuario debido a la política de reproducción automática del navegador — los consultantes verán un botón de "Iniciar" que deben pulsar antes de que suene el audio.
