// src/components/Watermark.tsx
export default function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      <img
        src="/haven-logo.png"
        alt=""
        className="select-none opacity-10 w-[70vw] max-w-[720px] md:max-w-[820px] lg:max-w-[900px]"
      />
    </div>
  );
}
