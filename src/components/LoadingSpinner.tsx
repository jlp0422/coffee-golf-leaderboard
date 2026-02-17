export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {/* Bouncing golf ball on a tee */}
      <div className="relative flex flex-col items-center">
        {/* Ball */}
        <div
          className="w-8 h-8 rounded-full bg-white border-2 border-green-900/20 shadow-md"
          style={{
            animation: "golfBounce 0.9s ease-in-out infinite",
            backgroundImage:
              "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(220,220,220,0.4) 100%)",
          }}
        />
        {/* Shadow (squishes as ball rises) */}
        <div
          className="mt-1 rounded-full bg-green-900/15"
          style={{
            animation: "golfShadow 0.9s ease-in-out infinite",
          }}
        />
        {/* Tee */}
        <div className="w-1.5 h-3 bg-amber-600 rounded-b-sm mt-0" />
      </div>

      <p
        className="text-green-800/50 text-sm"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {message}
      </p>

      <style>{`
        @keyframes golfBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes golfShadow {
          0%, 100% { width: 2rem; height: 0.35rem; }
          50%       { width: 1rem; height: 0.2rem; }
        }
      `}</style>
    </div>
  );
}
