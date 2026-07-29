"use client";

import { useCallback, useState } from "react";

export interface DisclosureState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (value: boolean) => void;
}

/** Shared open/close boolean state for dialogs, drawers, popovers, menus. */
export function useDisclosure(initialState = false): DisclosureState {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  return { isOpen, open, close, toggle, setOpen: setIsOpen };
}
