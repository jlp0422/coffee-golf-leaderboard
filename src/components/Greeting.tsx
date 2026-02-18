"use client";

export default function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return (
    <h1
      className="text-2xl font-bold text-green-900"
      style={{ fontFamily: "Georgia, serif" }}
    >
      Good {timeOfDay}, {name}
    </h1>
  );
}
