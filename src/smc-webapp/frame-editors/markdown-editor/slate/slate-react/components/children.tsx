import * as React from "react";
import { Editor, Range, Element, Ancestor, Descendant } from "slate";

import ElementComponent from "./element";
import TextComponent from "./text";
import { ReactEditor } from "..";
import { useSlateStatic } from "../hooks/use-slate-static";
import { useDecorate } from "../hooks/use-decorate";
import { NODE_TO_INDEX, NODE_TO_PARENT } from "../utils/weak-maps";
import { RenderElementProps, RenderLeafProps } from "./editable";
import { WindowedList } from "smc-webapp/r_misc";
import { shallowCompare } from "smc-util/misc";
import { SlateEditor } from "../../editable-markdown";

export interface WindowingParams {
  rowStyle?: React.CSSProperties;
  overscanRowCount?: number;
  estimatedRowSize?: number;
  rowSizeEstimator?: (Node) => number | undefined;
}

/**
 * Children.
 */

interface Props {
  decorations: Range[];
  node: Ancestor;
  renderElement?: React.FC<RenderElementProps>;
  renderLeaf?: React.FC<RenderLeafProps>;
  selection: Range | null;
  windowing?: WindowingParams;
  onScroll?: () => void; // called after scrolling when windowing is true.
  isComposing?: boolean;
  hiddenChildren?: Set<number>;
}

const Children: React.FC<Props> = React.memo(
  ({
    decorations,
    node,
    renderElement,
    renderLeaf,
    selection,
    windowing,
    onScroll,
    hiddenChildren,
  }) => {
    const decorate = useDecorate();
    const editor = useSlateStatic() as SlateEditor;
    let path;
    try {
      path = ReactEditor.findPath(editor, node);
    } catch (err) {
      console.log("WARNING: unable to find path to node", node, err);
      return (
        <div>
          (WARNING: unable to find path to node. You might have to close and
          open this file.)
        </div>
      );
    }
    const isLeafBlock =
      Element.isElement(node) &&
      !editor.isInline(node) &&
      Editor.hasInlines(editor, node);

    const renderChild = ({ index }) => {
      if (hiddenChildren?.has(index)) {
        // TRICK: We use a small positive height since a height of 0 gets ignored, as it often
        // appears when scrolling and allowing that breaks everything (for now!).
        return <div style={{ height: "0.1px" }} contentEditable={false} />;
      }
      const n = node.children[index] as Descendant;
      const key = ReactEditor.findKey(editor, n);
      let ds, range;
      if (path != null) {
        const p = path.concat(index);
        range = Editor.range(editor, p);
        ds = decorate([n, p]);
        for (const dec of decorations) {
          const d = Range.intersection(dec, range);

          if (d) {
            ds.push(d);
          }
        }
      } else {
        ds = [];
        range = null;
      }

      if (Element.isElement(n)) {
        return (
          <ElementComponent
            decorations={ds}
            element={n}
            key={key.id}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            selection={
              selection && range && Range.intersection(range, selection)
            }
          />
        );
      } else {
        return (
          <TextComponent
            decorations={ds ?? []}
            key={key.id}
            isLast={isLeafBlock && index === node.children.length - 1}
            parent={node as Element}
            renderLeaf={renderLeaf}
            text={n}
          />
        );
      }
    };

    for (let i = 0; i < node.children.length; i++) {
      const n = node.children[i];
      NODE_TO_INDEX.set(n, i);
      NODE_TO_PARENT.set(n, node);
    }

    if (path?.length === 0 && windowing != null) {
      // top level and using windowing!
      return (
        <WindowedList
          ref={editor.windowedListRef}
          render_info={true}
          row_count={node.children.length}
          row_renderer={renderChild}
          overscan_row_count={windowing.overscanRowCount ?? 3}
          estimated_row_size={windowing.estimatedRowSize ?? 60}
          row_size_estimator={
            windowing.rowSizeEstimator
              ? (index) => {
                  return node.children[index] != null
                    ? windowing.rowSizeEstimator?.(node.children[index])
                    : undefined;
                }
              : undefined
          }
          row_key={(index) => `${index}`}
          row_style={windowing.rowStyle}
          on_scroll={onScroll}
        />
      );
    } else {
      // anything else -- just render the children
      const children: JSX.Element[] = [];
      for (let index = 0; index < node.children.length; index++) {
        children.push(renderChild({ index }));
      }

      return <>{children}</>;
    }
  },
  (prev, next) => {
    if (next.isComposing) {
      // IMPORTANT: We prevent render while composing, since rendering
      // would corrupt the DOM which confuses composition input, thus
      // breaking input on Android, and many non-US languages. See
      // https://github.com/ianstormtaylor/slate/issues/4127#issuecomment-803215432
      return true;
    }
    return shallowCompare(prev, next);
  }
);

export default Children;
