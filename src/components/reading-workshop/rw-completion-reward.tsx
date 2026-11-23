import { congratulationMessage } from "@/lib/rw-comprehension";

const COLORS = ["var(--brand-green)", "var(--brand-yellow)", "var(--brand-blue)"];
const PIECES = Array.from({ length: 30 }, (_, index) => ({
  left: (index * 37 + 11) % 100,
  delay: (index % 10) * 0.09,
  duration: 3 + (index % 5) * 0.18,
  rotation: (index * 47) % 360,
  color: COLORS[index % COLORS.length],
  round: index % 4 === 0,
}));

/** A single non interactive celebration, mounted only after a newly completed score above 15. */
export function RwCompletionReward({ score, showConfetti }: { score: number; showConfetti: boolean }) {
  const message = congratulationMessage(score);
  return (
    <>
      {showConfetti && (
        <div className="rw-confetti-layer pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {PIECES.map((piece, index) => (
            <span
              key={index}
              className="rw-confetti-piece absolute top-0 block h-3 w-2"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                borderRadius: piece.round ? "999px" : "2px",
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
          <span className="rw-confetti-smiley absolute left-1/2 top-1/3 text-3xl">😊</span>
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-card px-4 py-3" role="status">
          <p className="text-sm font-semibold text-primary">{message}</p>
        </div>
      )}
    </>
  );
}
