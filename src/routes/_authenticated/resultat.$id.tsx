import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { Download, Loader2, MessageCircle, Printer } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessionResult } from "@/lib/test.functions";

export const Route = createFileRoute("/_authenticated/resultat/$id")({
  component: ResultPage,
});

const LEVEL_TITLE: Record<string, string> = {
  A1: "Débutant",
  A2: "Élémentaire",
  B1: "Intermédiaire",
  B2: "Intermédiaire avancé",
  C1: "Autonome",
  C2: "Maîtrise",
};

const LEVEL_TITLE_EN: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

const CATEGORY_EN: Record<string, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
};

function mention(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 90) return { fr: "Passé avec distinction", en: "Passed with Distinction" };
  if (s >= 80) return { fr: "Passé avec mérite", en: "Passed with Merit" };
  if (s >= 70) return { fr: "Réussi", en: "Passed" };
  return { fr: "Évalué", en: "Assessed" };
}

function ResultPage() {
  const { id } = Route.useParams();
  const fetchResult = useServerFn(getSessionResult);
  const [state, setState] = useState<{
    loading: boolean;
    data: Awaited<ReturnType<typeof getSessionResult>> | null;
    error: string | null;
  }>({ loading: true, data: null, error: null });
  const [qr, setQr] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchResult({ data: { sessionId: id } })
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: e instanceof Error ? e.message : "Erreur",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [id, fetchResult]);

  useEffect(() => {
    QRCode.toDataURL("https://wa.me/24174825725", {
      margin: 1,
      width: 180,
      color: { dark: "#0B1F3A", light: "#FFFFFF" },
    }).then(setQr).catch(() => setQr(""));
  }, []);

  const r = state.data;
  const verifId = r
    ? (r.candidateNumber ?? `ODC-${r.sessionId.slice(0, 8).toUpperCase()}`)
    : "";
  const dateStr = r?.completedAt
    ? new Date(r.completedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
  const fullName = r
    ? `${r.candidateFirstName} ${r.candidateLastName}`.trim() || "Candidate"
    : "";
  const m = mention(r?.score ?? null);

  const downloadPdf = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "JPEG", 0, 0, pageW, pageH);
      pdf.save(`OpenDoorsClass-Certificate-${verifId}.pdf`);
    } catch (e) {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {state.loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement de votre résultat...</p>
          </div>
        ) : state.error || !r ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {state.error ?? "Résultat introuvable."}
          </CardContent></Card>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="mx-auto overflow-auto">
              <div
                ref={certRef}
                className="mx-auto"
                style={{
                  width: "1123px",
                  height: "794px",
                  background:
                    "linear-gradient(135deg, #FDFBF3 0%, #FFFFFF 40%, #F5EFDF 100%)",
                  color: "#0B1F3A",
                  position: "relative",
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  boxShadow: "0 30px 80px -30px rgba(11,31,58,0.35)",
                }}
              >
                {/* Outer ornate border */}
                <div
                  style={{
                    position: "absolute",
                    inset: 24,
                    border: "2px solid #0B1F3A",
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 34,
                    border: "1px solid #C9A24B",
                    borderRadius: 2,
                  }}
                />
                {/* Corner ornaments */}
                {[
                  { top: 20, left: 20 },
                  { top: 20, right: 20, transform: "scaleX(-1)" },
                  { bottom: 20, left: 20, transform: "scaleY(-1)" },
                  { bottom: 20, right: 20, transform: "scale(-1,-1)" },
                ].map((pos, i) => (
                  <svg
                    key={i}
                    width="60"
                    height="60"
                    viewBox="0 0 60 60"
                    style={{ position: "absolute", ...pos } as React.CSSProperties}
                  >
                    <path
                      d="M0 0 L60 0 L60 4 L4 4 L4 60 L0 60 Z"
                      fill="#C9A24B"
                    />
                    <circle cx="14" cy="14" r="3" fill="#0B1F3A" />
                    <circle cx="14" cy="14" r="1.5" fill="#C9A24B" />
                  </svg>
                ))}

                {/* Watermark seal, background */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.04,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 340,
                      fontWeight: 900,
                      color: "#0B1F3A",
                      letterSpacing: -12,
                    }}
                  >
                    O
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    padding: "56px 72px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          background: "linear-gradient(135deg, #0B1F3A, #143a6b)",
                          color: "#C9A24B",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: 26,
                          border: "1.5px solid #C9A24B",
                        }}
                      >
                        O
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>
                          OpenDoorsClass
                        </div>
                        <div style={{ fontSize: 10.5, color: "#5a6675", letterSpacing: 2, textTransform: "uppercase" }}>
                          Institute of Languages, Gabon
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 10.5, color: "#5a6675" }}>
                      <div>Certificate N°</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0B1F3A", fontSize: 13 }}>
                        {verifId}
                      </div>
                      <div style={{ marginTop: 6 }}>Issued on {dateStr}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ textAlign: "center", marginTop: 26 }}>
                    <div style={{ fontSize: 10, letterSpacing: 6, color: "#C9A24B", fontWeight: 700 }}>
                      OPENDOORSCLASS
                    </div>
                    <h1
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 44,
                        fontWeight: 700,
                        margin: "6px 0 4px",
                        letterSpacing: 2,
                        color: "#0B1F3A",
                      }}
                    >
                      OFFICIAL CERTIFICATE OF ENGLISH LEVEL
                    </h1>
                    <div
                      style={{
                        width: 120,
                        height: 3,
                        background: "#C9A24B",
                        margin: "8px auto 0",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#5a6675", marginTop: 6, letterSpacing: 3 }}>
                      COMMON EUROPEAN FRAMEWORK OF REFERENCE (CEFR)
                    </div>
                  </div>

                  {/* Body */}
                  <div
                    style={{
                      marginTop: 22,
                      display: "grid",
                      gridTemplateColumns: "1fr 320px",
                      gap: 28,
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    {/* Left: identity + skills */}
                    <div>
                      <div style={{ fontSize: 12, color: "#5a6675", letterSpacing: 1 }}>
                        This is to certify that
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
                        {r.candidateAvatar ? (
                          <img
                            src={r.candidateAvatar}
                            alt=""
                            crossOrigin="anonymous"
                            style={{
                              width: 66,
                              height: 66,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "2px solid #C9A24B",
                            }}
                          />
                        ) : null}
                        <div>
                          <div
                            style={{
                              fontFamily: "'Cormorant Garamond', serif",
                              fontSize: 40,
                              fontWeight: 700,
                              lineHeight: 1.05,
                              color: "#0B1F3A",
                            }}
                          >
                            {fullName}
                          </div>
                          {r.candidateEmail ? (
                            <div style={{ fontSize: 11, color: "#5a6675", marginTop: 4 }}>
                              {r.candidateEmail}
                              {r.candidateCountry ? ` · ${r.candidateCountry}` : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.55, color: "#333" }}>
                        has successfully completed the OpenDoorsClass English positioning
                        assessment aligned with the Common European Framework of Reference
                        for Languages (CEFR), and has demonstrated the level indicated below.
                      </div>

                      {/* Skills */}
                      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {Object.entries(r.perCategory).map(([cat, s]) => (
                          <div
                            key={cat}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 10px",
                              border: "1px solid #E7DFC9",
                              borderRadius: 4,
                              background: "rgba(255,255,255,0.7)",
                              fontSize: 11.5,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#0B1F3A" }}>
                              {CATEGORY_EN[cat] ?? cat}
                            </span>
                            <span style={{ color: "#C9A24B", fontWeight: 700 }}>
                              {s.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: level card */}
                    <div
                      style={{
                        background: "linear-gradient(160deg, #0B1F3A 0%, #143a6b 100%)",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "22px 20px",
                        textAlign: "center",
                        border: "1.5px solid #C9A24B",
                        boxShadow: "0 20px 40px -20px rgba(11,31,58,0.4)",
                      }}
                    >
                      <div style={{ fontSize: 10, letterSpacing: 4, color: "#C9A24B", fontWeight: 700 }}>
                        CEFR LEVEL AWARDED
                      </div>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 96,
                          fontWeight: 700,
                          lineHeight: 1,
                          margin: "10px 0 4px",
                          color: "#C9A24B",
                          textShadow: "0 4px 12px rgba(0,0,0,0.25)",
                        }}
                      >
                        {r.levelResult ?? "N/A"}
                      </div>
                      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", opacity: 0.9 }}>
                        {r.levelResult ? LEVEL_TITLE_EN[r.levelResult] ?? "" : ""}
                      </div>
                      <div
                        style={{
                          margin: "14px auto 0",
                          height: 1,
                          background: "rgba(201,162,75,0.5)",
                          width: "80%",
                        }}
                      />
                      <div style={{ marginTop: 12, fontSize: 12 }}>
                        Overall Score
                        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>
                          {r.score ?? 0}%
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "#C9A24B",
                          color: "#0B1F3A",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        {m.en}
                      </div>
                    </div>
                  </div>

                  {/* Footer: signature + stamp + QR */}
                  <div
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      alignItems: "end",
                      gap: 24,
                    }}
                  >
                    {/* Signature */}
                    <div>
                      <div
                        style={{
                          fontFamily: "'Great Vibes', cursive",
                          fontSize: 46,
                          color: "#0B1F3A",
                          lineHeight: 1,
                          marginBottom: 2,
                        }}
                      >
                        OpenDoorsClass
                      </div>
                      <div style={{ height: 1, background: "#0B1F3A", width: "70%" }} />
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "#0B1F3A" }}>
                        MAYUKWA Nathan Harysthote
                      </div>
                      <div style={{ fontSize: 10, color: "#5a6675", letterSpacing: 1 }}>
                        Founder & Lead English Coach
                      </div>
                    </div>

                    {/* Stamp */}
                    <div
                      style={{
                        width: 108,
                        height: 108,
                        borderRadius: "50%",
                        border: "2.5px solid #C9A24B",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        transform: "rotate(-8deg)",
                        color: "#0B1F3A",
                        background:
                          "radial-gradient(circle at center, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 6,
                          border: "1px dashed #C9A24B",
                          borderRadius: "50%",
                        }}
                      />
                      <div style={{ textAlign: "center", fontSize: 8, letterSpacing: 1, lineHeight: 1.15 }}>
                        <div style={{ fontWeight: 800, letterSpacing: 2 }}>OFFICIAL</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, margin: "2px 0" }}>
                          OpenDoorsClass
                        </div>
                        <div>· CERTIFIED ·</div>
                        <div style={{ marginTop: 2 }}>GABON</div>
                      </div>
                    </div>

                    {/* QR */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {qr ? (
                        <img src={qr} alt="Verification QR" style={{ width: 84, height: 84 }} />
                      ) : (
                        <div style={{ width: 84, height: 84, background: "#eee" }} />
                      )}
                      <div style={{ fontSize: 9, color: "#5a6675", textAlign: "right", lineHeight: 1.3 }}>
                        Scan to verify
                        <br />
                        wa.me/24174825725
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation, outside the certificate */}
            {r.recommendation ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-foreground print:hidden">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  Recommandation pédagogique · {m.fr}
                </div>
                {r.recommendation}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
              <Button
                onClick={downloadPdf}
                disabled={downloading}
                className="bg-brand-gradient text-primary-foreground hover-scale"
              >
                {downloading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Télécharger le certificat en PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Imprimer
              </Button>
              <Button asChild variant="outline">
                <Link to="/tableau-de-bord">Retour à mon espace</Link>
              </Button>
              <Button asChild variant="secondary">
                <a href="https://wa.me/24174825725" target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-4" />
                  Discuter avec un conseiller
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

// exported translations are handled inline (CATEGORY_EN / LEVEL_TITLE / LEVEL_TITLE_EN).
void LEVEL_TITLE;