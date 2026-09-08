import type { Lang } from '../i18n';
/** Plain-language entry points. These descriptions make no treatment-outcome claims. */
const activities = {
  grounding: ['Notice what is around you', 'Explore one sense at a time. Skip any that do not suit you.', 'Observa lo que te rodea', 'Explora un sentido a la vez. Puedes saltarte cualquiera.', '◎'],
  'feeling-wheel': ['Name a feeling', 'Choose a feeling and explore words that fit.', 'Ponle nombre a una emoción', 'Elige una emoción y explora palabras que te representen.', '✳'],
  breath: ['Find a comfortable breath', 'Try a gentle pace. You can breathe normally or stop at any time.', 'Encuentra una respiración cómoda', 'Prueba un ritmo suave. Puedes respirar normalmente o parar cuando quieras.', '≋'],
  'safe-place': ['Imagine a calm place', 'Choose a place and details to make it your own.', 'Imagina un lugar tranquilo', 'Elige un lugar y detalles para hacerlo tuyo.', '⌂'],
  container: ['Put a worry aside for now', 'Choose a container. Writing anything down is optional.', 'Deja una preocupación a un lado', 'Elige un contenedor. Escribir es opcional.', '▱'],
  sandtray: ['Build a scene', 'Arrange figures in the sand. There is no right scene to make.', 'Construye una escena', 'Coloca figuras en la arena. No hay una escena correcta.', '◇'],
  'butterfly-hug': ['Try gentle alternating taps', 'Follow a rhythm you and your clinician have chosen.', 'Prueba toques suaves alternos', 'Sigue un ritmo que hayas elegido con tu profesional.', '⋈'],
  lightstream: ['Imagine a gentle light', 'Explore color and imagination at your own pace.', 'Imagina una luz suave', 'Explora el color y la imaginación a tu ritmo.', '☼'],
  sud: ['How strong is the feeling?', 'Use a 0–10 scale with optional child-friendly language.', '¿Qué tan intensa es la sensación?', 'Usa una escala del 0 al 10 con lenguaje infantil opcional.', '↗'],
  voc: ['How true does it feel?', 'Use a 1–7 belief scale together with your clinician.', '¿Qué tan verdadero se siente?', 'Usa una escala de creencias del 1 al 7 con tu profesional.', '↗'],
  'bls-visual': ['Follow a moving target', 'Visual bilateral stimulation for clinician-led sessions.', 'Sigue un punto en movimiento', 'Estimulación bilateral visual para sesiones dirigidas por profesionales.', '↔'],
  'bls-audio': ['Listen to alternating sounds', 'Audio bilateral stimulation for clinician-led sessions.', 'Escucha sonidos alternos', 'Estimulación bilateral auditiva para sesiones dirigidas por profesionales.', '♫'],
  'bls-combined': ['Follow a target with sound', 'Combined bilateral stimulation for clinician-led sessions.', 'Sigue un punto con sonido', 'Estimulación bilateral combinada para sesiones dirigidas por profesionales.', '↔'],
  'bls-tapping': ['Follow alternating taps', 'A visual tapping rhythm for clinician-led sessions.', 'Sigue toques alternos', 'Un ritmo visual de toques para sesiones dirigidas por profesionales.', '⋈'],
} satisfies Record<string, string[]>;
export type ActivitySlug = keyof typeof activities;
export function activityContent(slug: string, lang: Lang) {
  const row = activities[slug as ActivitySlug];
  return row ? { name: row[lang === 'es' ? 2 : 0], description: row[lang === 'es' ? 3 : 1], symbol: row[4] } : undefined;
}
