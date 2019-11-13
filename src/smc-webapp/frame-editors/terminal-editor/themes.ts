/*
Our predefined terminal color themes.
*/

import { ITheme, Terminal } from "xterm";

export function background_color(theme_name: string): string {
  const t = color_themes[theme_name];
  if (t == null) {
    // should never happen
    return "white";
  }
  return t.colors[17];
}

export function setTheme(terminal: Terminal, theme_name: string): void {
  let t = color_themes[theme_name];
  if (t == null) {
    t = color_themes["default"];
    if (t == null) {
      // can't happen
      return;
    }
  }
  const colors = t.colors;
  if (colors == null) {
    // satisfies typescript
    return;
  }
  const theme: ITheme = {
    background: colors[17],
    foreground: colors[16],
    cursor: colors[16],
    cursorAccent: colors[17],
    selection: "rgba(128, 128, 160, 0.25)",
    black: colors[0],
    red: colors[1],
    green: colors[2],
    yellow: colors[3],
    blue: colors[4],
    magenta: colors[5],
    cyan: colors[6],
    white: colors[7],
    brightBlack: colors[8],
    brightRed: colors[9],
    brightGreen: colors[10],
    brightYellow: colors[11],
    brightBlue: colors[12],
    brightMagenta: colors[13],
    brightCyan: colors[14],
    brightWhite: colors[15]
  };
  terminal.setOption("theme", theme);
}

const color_themes = {
  "solarized-dark": {
    comment: "Solarized dark",
    colors: [
      "#eee8d5",
      "#dc322f",
      "#859900",
      "#b58900",
      "#268bd2",
      "#d33682",
      "#2aa198",
      "#073642",
      "#fdf6e3",
      "#cb4b16",
      "#93a1a1",
      "#839496",
      "#657b83",
      "#6c71c4",
      "#586e75",
      "#002b36",
      "#eee8d5",
      "#002b36"
    ]
  },
  "solarized-light": {
    comment: "Solarized light",
    colors: [
      "#073642",
      "#dc322f",
      "#859900",
      "#b58900",
      "#268bd2",
      "#d33682",
      "#2aa198",
      "#eee8d5",
      "#002b36",
      "#cb4b16",
      "#586e75",
      "#657b83",
      "#839496",
      "#6c71c4",
      "#93a1a1",
      "#fdf6e3",
      "#073642",
      "#fdf6e3"
    ]
  },
  "low-contrast": {
    comment: "Low contrast dark",
    colors: [
      "#222222",
      "#9e5641",
      "#6c7e55",
      "#caaf2b",
      "#7fb8d8",
      "#956d9d",
      "#4c8ea1",
      "#808080",
      "#454545",
      "#cc896d",
      "#c4df90",
      "#ffe080",
      "#b8ddea",
      "#c18fcb",
      "#6bc1d0",
      "#cdcdcd",
      "#cdcdcd",
      "#343434"
    ]
  },
  "raven-dark": {
    comment: "Raven dark",
    colors: [
      "#3f3e3b",
      "#b36b65",
      "#4f8c61",
      "#8d7e45",
      "#6181b8",
      "#a46d9d",
      "#0e8e9a",
      "#b6b7bb",
      "#7f7f83",
      "#efa29b",
      "#86c596",
      "#c7b679",
      "#9ab9f3",
      "#dfa4d7",
      "#5ec7d4",
      "#feffff",
      "#a6a7aa",
      "#32312e"
    ]
  },
  default: {
    comment: "Default black on white",
    colors: [
      "#2e3436",
      "#cc0000",
      "#4e9a06",
      "#c4a000",
      "#3465a4",
      "#75507b",
      "#06989a",
      "#d3d7cf",
      "#555753",
      "#ef2929",
      "#8ae234",
      "#fce94f",
      "#729fcf",
      "#ad7fa8",
      "#34e2e2",
      "#eeeeec",
      "#000000",
      "#ffffff"
    ]
  },
  mono: {
    comment: "Monochrome dark",
    colors: [
      "#000000",
      "#434343",
      "#6b6b6b",
      "#969696",
      "#4a4a4a",
      "#707070",
      "#a9a9a9",
      "#ffffff",
      "#222222",
      "#434343",
      "#a5a5a5",
      "#e5e5e5",
      "#4d4d4d",
      "#747474",
      "#c4c4c4",
      "#dedede",
      "#b0b0b0",
      "#282828"
    ]
  },
  tango: {
    comment: "Tango light",
    colors: [
      "#2e3436",
      "#cc0000",
      "#4e9a06",
      "#c4a000",
      "#3465a4",
      "#75507b",
      "#06989a",
      "#d3d7cf",
      "#555753",
      "#ef2929",
      "#8ae234",
      "#fce94f",
      "#729fcf",
      "#ad7fa8",
      "#34e2e2",
      "#eeeeec",
      "#000000",
      "#ffffff"
    ]
  },
  infred: {
    comment: "Infinite red dark",
    colors: [
      "#6c6c6c",
      "#e9897c",
      "#b6e77d",
      "#ecebbe",
      "#a9cdeb",
      "#ea96eb",
      "#c9caec",
      "#f2f2f2",
      "#747474",
      "#f99286",
      "#c3f786",
      "#fcfbcc",
      "#b6defb",
      "#fba1fb",
      "#d7d9fc",
      "#e2e2e2",
      "#f2f2f2",
      "#101010"
    ]
  },
  "raven-light": {
    comment: "Raven light",
    colors: [
      "#e7dfd5",
      "#f46864",
      "#00ae58",
      "#ac9510",
      "#389bff",
      "#dc6dd2",
      "#00b0cc",
      "#5b636b",
      "#8f98a1",
      "#b42b33",
      "#007525",
      "#726000",
      "#0066cb",
      "#a03398",
      "#007793",
      "#00020e",
      "#69717a",
      "#faf0e6"
    ]
  }
};

// Use theme_desc for UI to select a theme.

export const theme_desc = {};
for (const name in color_themes) {
  theme_desc[name] = color_themes[name].comment;
}
