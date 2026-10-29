import type { Metadata } from "next";
import { getBooks } from "../../../lib/books";
import BooksClient from "./BooksClient";

export const metadata: Metadata = { title: "Books" };
export const dynamic = "force-dynamic";

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const { book } = await searchParams;
  return <BooksClient books={await getBooks()} initialBook={Number(book) || null} />;
}
