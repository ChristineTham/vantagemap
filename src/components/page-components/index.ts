/**
 * Public entry point for the VantageMap page-component library.
 *
 * Import the registry and renderer from here rather than reaching into
 * individual component files.
 */

export type {
  PageComponentProps,
  PageComponent,
  PageComponentMeta,
} from "./types";
export { PAGE_COMPONENT_REGISTRY, PAGE_COMPONENT_META } from "./registry";
export { PageComponentRenderer } from "./PageComponentRenderer";
