/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Descendant, Node } from "slate";
import { handlers } from "./register";
import { State, Token } from "./types";
import { parse_markdown } from "./parse-markdown";

export interface CursorRef {
  current?: { node: Node; offset: number };
}

export interface Options {
  cursorRef?: CursorRef;
}

export function parse(
  token: Token,
  state: State,
  options: Options
): Descendant[] {
  for (const handler of handlers) {
    const nodes: Descendant[] | undefined = handler({ token, state, options });
    if (nodes != null) {
      return nodes;
    }
  }

  throw Error(
    `some handler must process every token -- ${JSON.stringify(token)}`
  );
}

export function markdown_to_slate(
  markdown: string,
  options?: Options
): Descendant[] {
  // Parse the markdown:
  const tokens = parse_markdown(markdown);

  const doc: Descendant[] = [];
  const state: State = { marks: {}, nesting: 0 };
  if (options == null) {
    options = {};
  }
  for (const token of tokens) {
    for (const node of parse(token, state, options)) {
      doc.push(node);
    }
  }

  if (doc.length == 0) {
    // empty doc isn't allowed; use the simplest doc.
    doc.push({
      type: "paragraph",
      children: [{ text: "" }],
    });
  }

  (window as any).x = {
    tokens,
    doc,
  };

  return doc;
}
