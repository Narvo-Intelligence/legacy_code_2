import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f6ef] dark:bg-narvo-ink text-narvo-ink dark:text-white">
      <h2 className="text-4xl font-serif font-bold mb-4">Not Found</h2>
      <p className="mb-8">Could not find requested resource</p>
      <Link href="/" className="px-6 py-3 bg-narvo-vermilion text-white rounded-full font-bold">
        Return Home
      </Link>
    </div>
  );
}
