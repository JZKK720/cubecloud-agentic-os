// A2uiBlock.tsx — render one validated A2UI block.
//
// The validation lives in `src/shared/a2ui.ts` so it can be unit-tested without
// a DOM and so the main process could validate the same shape if a block ever
// arrives over IPC. This component assumes the block already passed.
//
// REUSE, NOT REINVENTION: the markup is a plain <table>, which means the
// existing `.chat-bubble-agent table/th/td` rules style it with no new CSS. The
// design system already decided how a table looks in a chat bubble; this
// component joins that decision rather than forking it.
//
// React escapes text children by construction, so a cell containing `<script>`
// renders as those literal characters. That is why cells are children and never
// `dangerouslySetInnerHTML` — the injection defence is the rendering model, not
// a sanitiser we would have to keep correct.

import type { A2uiTableBlock } from "../../../shared/a2ui";

export function A2uiBlock({
  block,
}: {
  block: A2uiTableBlock;
}): React.JSX.Element {
  return (
    <figure className="a2ui-block">
      {block.caption ? (
        <figcaption className="a2ui-caption">{block.caption}</figcaption>
      ) : null}
      <table>
        <thead>
          <tr>
            {block.columns.map((column, i) => (
              // Position is the only stable identity: values are model output
              // and may legitimately repeat, so `column` is not a key.
              <th key={i} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
