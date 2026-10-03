/** Child content accepted by `h`. Strings become text nodes (never parsed as HTML). */
export type Child = Node | string | null | undefined | false;

/** Element options for `h`. */
export interface ElementOptions {
  readonly class?: string;
  readonly text?: string;
  readonly attrs?: Record<string, string>;
  readonly on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>>;
}

/**
 * Create an element safely: text goes through `textContent` / text nodes only.
 * @param tag - tag name
 * @param options - class, text, attributes and event listeners
 * @param children - child nodes or strings
 * @returns the created element
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options.class) el.className = options.class;
  if (options.text !== undefined) el.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) el.setAttribute(name, value);
  for (const [type, listener] of Object.entries(options.on ?? {})) {
    if (listener) el.addEventListener(type, listener);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/**
 * Trigger a browser download of a text file.
 * @param filename - suggested file name
 * @param content - file content
 * @param mime - MIME type
 */
export function downloadText(filename: string, content: string, mime = 'text/markdown;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = h('a', { attrs: { href: url, download: filename } });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
