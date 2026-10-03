// Native Ask AI (D53, D58 §7): any screen can open the one assistant with a
// question. AppLayout listens and opens the drawer; the assistant asks it with
// the screen in view as context. No second chatbot.
export const ASK_EVENT = 'conncct:ask-ai';

export function askAi(question) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: { question: String(question || '') } }));
}
