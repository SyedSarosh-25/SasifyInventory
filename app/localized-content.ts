import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { translateText, type Language } from './localization.ts';

/** Localize rendered display nodes only, never values, URLs or component data. */
export function localizeContent(node: ReactNode, language: Language): ReactNode {
  if (language === 'en') return node;
  if (typeof node === 'string') return translateText(node, language);
  if (Array.isArray(node)) return Children.map(node, child => localizeContent(child, language));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props;
  if (props.translate === 'no' || props['data-no-translate'] || ['script', 'style', 'pre', 'code', 'textarea', 'dd'].includes(String(element.type))) return element;
  const translated: Record<string, unknown> = {};
  // Only native display attributes. Keep custom component contracts intact.
  if (typeof element.type === 'string') {
    for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
      if (typeof props[attribute] === 'string') translated[attribute] = translateText(props[attribute] as string, language);
    }
  }
  if (props.children !== undefined) translated.children = localizeContent(props.children as ReactNode, language);
  return cloneElement(element, translated);
}
