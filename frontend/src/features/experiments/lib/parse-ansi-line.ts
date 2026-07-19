import Anser from "anser";

export interface AnsiSegment {
  text: string;
  fg: string | null;
  bg: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/** Training script output routinely carries ANSI color codes (tqdm bars, colored loggers) - parsed into plain segments so the log viewer can render color without `dangerouslySetInnerHTML`. */
export function parseAnsiLine(line: string): AnsiSegment[] {
  const entries = Anser.ansiToJson(line, { remove_empty: true, use_classes: false });
  return entries.map((entry) => ({
    text: entry.content,
    fg: entry.fg || null,
    bg: entry.bg || null,
    bold: entry.decorations.includes("bold"),
    italic: entry.decorations.includes("italic"),
    underline: entry.decorations.includes("underline"),
  }));
}
