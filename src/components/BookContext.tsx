import { createContext, useContext } from "react";

/** The current book id, so deep components (item icons) can resolve art paths
 *  by convention: art/<bookId>/items/<itemId>.png */
export const BookContext = createContext<string>("book1");
export const useBookId = () => useContext(BookContext);
