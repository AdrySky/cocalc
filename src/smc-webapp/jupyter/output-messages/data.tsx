/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Map } from "immutable";
import { React } from "smc-webapp/app-framework";
import { all_fields_equal } from "smc-util/misc";
import { Markdown, HTML } from "../../r_misc";
import { JupyterActions } from "../browser-actions";
import { Ansi, is_ansi } from "./ansi";
import { Image } from "./image";
import { IFrame } from "./iframe";
import { Javascript } from "./javascript";
import { UntrustedJavascript } from "./untrusted-javascript";
import { PDF } from "./pdf";
import { STDERR_STYLE, STDOUT_STYLE } from "./style";
import { TextPlain } from "./text-plain";

// share server can't handle this (yet!), so we have to use require.
// import { Widget } from "./widget";
let Widget: any = undefined;
try {
  Widget = require("./widget").Widget;
} catch (err) {
  console.log("Widget rendering not available");
}

const SHA1_REGEXP = /^[a-f0-9]{40}$/;
function is_sha1(s: string): boolean {
  return s.length === 40 && !!s.match(SHA1_REGEXP);
}

interface DataProps {
  message: Map<string, any>;
  project_id?: string;
  directory?: string;
  // id?: string;
  actions?: JupyterActions;
  name?: string;
  trust?: boolean;
}

function should_memoize(prev, next) {
  return (
    prev.message.equals(next.message) &&
    all_fields_equal(prev, next, ["id", "trust"])
  );
}

export const Data: React.FC<DataProps> = React.memo((props: DataProps) => {
  const { message, project_id, directory, actions, name, trust } = props;

  function render_html(value: string): JSX.Element {
    return (
      <div style={{ margin: "5px 0" }}>
        <HTML
          value={value}
          auto_render_math={true}
          project_id={project_id}
          file_path={directory}
          safeHTML={!trust}
        />
      </div>
    );
  }

  function render_markdown(value: string): JSX.Element {
    return (
      <div style={{ margin: "5px 0" }}>
        <Markdown
          value={value}
          project_id={project_id}
          file_path={directory}
          safeHTML={!trust}
        />
      </div>
    );
  }

  function render_data(
    type: string,
    value: any,
    data: Map<string, any>
  ): JSX.Element | null {
    if (type != "") {
      const [a, b] = type.split("/");
      switch (a) {
        case "text":
          switch (b) {
            case "plain":
              if (
                data.has("application/vnd.jupyter.widget-view+json") &&
                actions != null
              ) {
                // TODO: this is pretty dumb for now, but it'll do *temporarily*...
                // used for history, and maybe share server.  Obviously, we want
                // as much to be "alive" as possible at some point!
                return null;
              }
              if (is_ansi(value)) {
                return (
                  <div style={STDOUT_STYLE}>
                    <Ansi>{value}</Ansi>
                  </div>
                );
              }
              return <TextPlain value={value} />;

            case "html":
            case "latex": // put latex as HTML, since jupyter requires $'s anyways.
              return render_html(value);

            case "markdown":
              return render_markdown(value);
          }
          break;

        case "image":
          let height: any;
          let width: any;
          message.get("metadata", []).forEach((value: any, key: any) => {
            if (key === "width") {
              width = value;
            } else if (key === "height") {
              height = value;
            } else {
              // sometimes metadata is e.g., "image/png":{width:, height:}
              if (value && value.forEach) {
                value.forEach((value: any, key: any) => {
                  if (key === "width") {
                    width = value;
                  } else if (key === "height") {
                    height = value;
                  }
                });
              }
            }
          });

          let sha1: string | undefined = undefined;
          let val: string | undefined = undefined;

          if (typeof value === "string") {
            if (is_sha1(value)) {
              // use a heuristic to see if it sha1.  TODO: maybe we shouldn't.
              sha1 = value;
            } else {
              val = value;
            }
          } else if (typeof value === "object") {
            val = value.get("value");
          }
          return (
            <Image
              project_id={project_id}
              type={type}
              sha1={sha1}
              value={val}
              width={width}
              height={height}
            />
          );

        case "iframe":
          if (value == null || project_id == null) {
            return <pre>iframe must specify project_id and sha1</pre>;
          } else {
            return <IFrame sha1={value} project_id={project_id} />;
          }

        case "application":
          switch (b) {
            case "javascript":
              if (trust) {
                return <Javascript value={value} />;
              }
              return <UntrustedJavascript value={value} />;

            case "pdf":
              if (project_id == null || value == null) {
                console.warn("PDF: project_id and value must be specified");
                return <pre>Invalid PDF output</pre>;
              }
              return <PDF value={value} project_id={project_id} />;

            case "vnd.jupyter.widget-view+json":
              if (Widget == null || name == null || actions == null) {
                // TODO...
                return null;
              }
              return <Widget value={value} actions={actions} name={name} />;
          }
          break;
      }
    }

    throw Error(`Unsupported message type: ${type}`);
  }

  const data = message.get("data");
  if (data == null || typeof data.forEach != "function") return;

  const v: any[] = [];
  let error: any = undefined;
  data.forEach((value, type) => {
    try {
      v.push([type, <div>{render_data(type, value, data)}</div>]);
    } catch (err) {
      // will only use this if nothing else works.
      error = err;
    }
  });

  if (v.length > 1) {
    // Note about multiple representations; we should only render the best one.
    // For us the algorithm should be: if the options are (a) anything
    // we know how to render, and (b) text/plain, then render the first
    // thing we know how to render that is not text/plain.
    // This is inefficient, since we rendered more than one, and then just
    // throw away all but one.
    for (const x of v) {
      if (x[0] != "text/plain") {
        return x[1];
      }
    }
  }

  if (v.length == 0) {
    if (error != null) {
      return <div style={STDERR_STYLE}>{`${error}`}</div>;
    } else {
      return <div />;
    }
  }

  return v[0][1];
}, should_memoize);
