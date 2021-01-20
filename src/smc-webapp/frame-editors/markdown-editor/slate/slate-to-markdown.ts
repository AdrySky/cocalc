/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */
import { Node, Element, Text } from "slate";
import { serializeLeaf } from "./leaf-to-markdown";
import { serializeElement } from "./element-to-markdown";

export interface Info {
  parent: Node; // the parent of the node being serialized
  index?: number; // index of this node among its siblings
  no_escape: boolean; // if true, do not escape text in this node.
  cursor?: { node: Node; offset: number };
}

export function serialize(node: Node, info: Info): string {
  if (Text.isText(node)) {
    return serializeLeaf(node, info);
  } else if (Element.isElement(node)) {
    return serializeElement(node, info);
  } else {
    throw Error(
      `bug:  node must be Text or Element -- ${JSON.stringify(node)}`
    );
  }
}

export function slate_to_markdown(
  data: Node[],
  options?: { no_escape?: boolean; cursor?: { node: Node; offset: number } }
): string {
  const r = data
    .map((node) =>
      serialize(node, {
        parent: node,
        no_escape: !!options?.no_escape,
        cursor: options?.cursor,
      })
    )
    .join("");
  return r;
}
