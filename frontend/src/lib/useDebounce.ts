import { useEffect, useState } from "react";

/**
 * Custom hook that returns a debounced version of any value.
 * Perfect for live search inputs, search parameters, and responsive filters.
 *
 * @param value The value to debounce
 * @param delay Time in ms to delay updating (default: 250ms)
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
