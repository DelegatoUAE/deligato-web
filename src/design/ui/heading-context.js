import { createContext, useContext } from 'react';

/**
 * Heading level for the next section title. The page <h1> lives in
 * PageHeader, so top-level Cards, Panels and empty states render <h2>; a
 * titled Card or Panel raises the level for whatever it contains, so the
 * outline never skips a level (h1 > h3) whatever the nesting.
 */
export const HeadingLevel = createContext(2);
export const useHeadingLevel = () => useContext(HeadingLevel);
export const headingTag = (level) => `h${Math.min(Math.max(level, 1), 6)}`;
