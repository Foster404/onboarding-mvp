export default function Avatar({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="h-full w-full object-cover" />;
  }
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={alt} className="h-full w-full">
      <rect width="100" height="100" fill="#e2e8f0" />
      <circle cx="50" cy="38" r="18" fill="#94a3b8" />
      <path d="M50 60c-22 0-36 14-36 32v8h72v-8c0-18-14-32-36-32z" fill="#94a3b8" />
    </svg>
  );
}
