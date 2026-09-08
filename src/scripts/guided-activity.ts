/** Small DOM helpers for optional guided activities; choices stay in this page only. */
export function focusActivityPanel(panel: HTMLElement): void {
  const heading = panel.querySelector<HTMLElement>('h2, h3, [data-flow-script]') ?? panel;
  heading.tabIndex = -1;
  heading.focus();
}

export function setPressedChoice(root: HTMLElement, selector: string, selected: HTMLElement | null): void {
  root.querySelectorAll<HTMLElement>(selector).forEach((button) => {
    const pressed = button === selected;
    button.setAttribute('aria-pressed', String(pressed));
    button.classList.toggle('ring-2', pressed);
    button.classList.toggle('ring-bronze-400', pressed);
  });
}

/** Finish is a session boundary, not a score or a claim that the person is calmer. */
export function mountGuidedFinish(root: HTMLElement, stop: () => void): () => void {
  const es = document.documentElement.lang === 'es';
  const content = root.querySelector<HTMLElement>('[data-guided-content]')!;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.guidedFinish = '';
  button.className = 'mt-6 min-h-11 px-5 py-3 rounded-lg border border-forest-400 text-forest-100 font-semibold';
  button.textContent = es ? 'Terminar por ahora' : 'Finish for now';
  const panel = document.createElement('section');
  panel.dataset.guidedFinished = '';
  panel.hidden = true;
  panel.className = 'w-full py-5 text-forest-100';
  const heading = document.createElement('h2');
  heading.className = 'font-serif text-2xl mb-3';
  heading.textContent = es ? 'Actividad terminada.' : 'Activity finished.';
  const message = document.createElement('p');
  message.className = 'text-forest-200 mb-4';
  message.textContent = es ? 'Puedes parar aquí. No tienes que sentirte de una manera específica.' : 'You can stop here. You do not need to feel any particular way.';
  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.dataset.guidedReturn = '';
  returnButton.className = 'block min-h-11 px-4 py-2 mb-3 rounded-lg bg-forest-700 text-forest-100';
  returnButton.textContent = es ? 'Volver a la actividad' : 'Return to activity';
  const activitiesLink = document.createElement('a');
  activitiesLink.href = es ? '/es/tools' : '/tools';
  activitiesLink.className = 'inline-block py-3 underline text-bronze-300';
  activitiesLink.textContent = es ? 'Elegir otra actividad' : 'Choose another activity';
  panel.append(heading, message, returnButton, activitiesLink);
  root.append(button, panel);
  const finish = () => {
    root.dataset.guidedFinished = 'true';
    stop();
    window.speechSynthesis?.cancel();
    content.hidden = true;
    button.hidden = true;
    panel.hidden = false;
    focusActivityPanel(panel);
  };
  button.addEventListener('click', finish);
  returnButton.addEventListener('click', () => {
    root.dataset.guidedFinished = 'false';
    content.hidden = false;
    button.hidden = false;
    panel.hidden = true;
    const activeStep = content.querySelector<HTMLElement>('[data-step]:not(.hidden)');
    focusActivityPanel(activeStep ?? content);
  });
  window.addEventListener('pagehide', () => { stop(); window.speechSynthesis?.cancel(); });
  return finish;
}
