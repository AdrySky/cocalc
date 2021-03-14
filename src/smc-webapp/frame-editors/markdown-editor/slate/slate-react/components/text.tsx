import * as React from "react";
import { useRef } from "react";
import { Range, Element, Text as SlateText } from "slate";

import Leaf from "./leaf";
import { ReactEditor, useSlateStatic } from "..";
import { RenderLeafProps } from "./editable";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import {
  KEY_TO_ELEMENT,
  NODE_TO_ELEMENT,
  ELEMENT_TO_NODE,
} from "../utils/weak-maps";

/**
 * Text.
 */

const Text = (props: {
  decorations: Range[];
  isLast: boolean;
  parent: Element;
  renderLeaf?: React.FC<RenderLeafProps>;
  text: SlateText;
  isPreview?: boolean;
}) => {
  const { decorations, isLast, parent, renderLeaf, text, isPreview } = props;
 // console.log('render Text', text, isPreview);
  const editor = useSlateStatic();
  const ref = useRef<HTMLSpanElement>(null);
  const leaves = SlateText.decorations(text, decorations);
  const children: JSX.Element[] = [];
  const key = ReactEditor.findKey(editor, text);

  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    // We need to use a key specifically for each leaf,
    // otherwise when doing incremental search it doesn't
    // properly update (which makes perfect sense).
    const leaf_key = ReactEditor.findKey(editor, leaf);

    children.push(
      <Leaf
        isLast={isLast && i === leaves.length - 1}
        key={leaf_key.id}
        leaf={leaf}
        text={text}
        parent={parent}
        renderLeaf={renderLeaf}
        isPreview={isPreview}
      />
    );
  }

  // Update element-related weak maps with the DOM element ref.
  useIsomorphicLayoutEffect(() => {
    if (ref.current) {
      KEY_TO_ELEMENT.set(key, ref.current);
      NODE_TO_ELEMENT.set(text, ref.current);
      ELEMENT_TO_NODE.set(ref.current, text);
    } else {
      KEY_TO_ELEMENT.delete(key);
      NODE_TO_ELEMENT.delete(text);
    }
  });

  return (
    <span data-slate-node="text" ref={ref}>
      {children}
    </span>
  );
};

const MemoizedText = React.memo(Text, (prev, next) => {
  // I think including parent is wrong here. E.g.,
  // parent is not included in the analogous function
  // in element.tsx. See my comment here:
  // https://github.com/ianstormtaylor/slate/issues/4056#issuecomment-768059323

  if (next.isPreview != prev.isPreview) return false;
  if (next.isPreview) {
    return true;
    //return next.text == prev.text;
  }
  const is_equal =
    // next.parent === prev.parent &&
    next.renderLeaf === prev.renderLeaf &&
    next.isLast === prev.isLast &&
    next.text === prev.text &&
    next.decorations === prev.decorations;
  return is_equal;
});

export default MemoizedText;
