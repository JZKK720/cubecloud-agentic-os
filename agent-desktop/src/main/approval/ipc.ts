// approval/ipc.ts — the IPC-facing slice of the approval inbox.
//
// Extracted from main/index.ts so the handlers can be invoked in tests
// without booting Electron. index.ts keeps the five channel names and
// delegates each body to these functions; nothing about the wire contract
// changes.
//
// `create` deliberately returns the entry synchronously. The renderer needs
// an id before it can render approve/deny buttons; a promise here would
// deadlock the dialog.

import type { ApprovalEntry, ApprovalInbox, ApprovalInput } from "./inbox";

export interface ApprovalIpc {
  create(input: ApprovalInput): ApprovalEntry;
  approve(id: string): boolean;
  deny(id: string): boolean;
  list(includeAll?: boolean): ApprovalEntry[];
  hasPending(): boolean;
}

export function createApprovalIpc(inbox: ApprovalInbox): ApprovalIpc {
  return {
    create: (input) => inbox.create(input),
    approve: (id) => inbox.approve(id),
    deny: (id) => inbox.deny(id),
    list: (includeAll) => inbox.list(includeAll),
    hasPending: () => inbox.hasPending(),
  };
}
