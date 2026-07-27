import { useState, useCallback } from "react";
import { FORMATS_BY_ID, DEFAULT_FORMAT_ID } from "../data/formats";

const STORAGE_KEY = "active_format";

export function useFormat() {
  const [formatId, setFormatId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_FORMAT_ID
  );

  const format = FORMATS_BY_ID[formatId] || FORMATS_BY_ID[DEFAULT_FORMAT_ID];

  const setFormat = useCallback((id) => {
    setFormatId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { format, formatId, setFormat };
}
