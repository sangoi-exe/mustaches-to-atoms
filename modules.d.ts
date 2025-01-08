declare module "react-attr-converter" {
  function toReactAttribute(attr: string): string;
  function toHTMLAttribute(attr: string): string;
  export { toReactAttribute, toHTMLAttribute };
}

declare module "reserved-words";

declare module "is-self-closing" {
  function isSelfClosing(tagName: string): boolean;
  export default isSelfClosing;
}
