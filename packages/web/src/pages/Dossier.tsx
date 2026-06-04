// SPDX-License-Identifier: MIT
//
// Dossier — the analyst-grade investment brief for one startup. Renders the full
// StartupDossier: header + snapshot + metrics, founder deep-dive, product, market,
// competition, traction with unit economics, the round + cap table, thesis fit,
// the diligence plan, live signals, network, recognition, files, memos, sources.

import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  StartupDossier,
  FounderProfile,
  Metric,
  Alert,
  Source,
} from "@boringos-vcbrain/shared";
import { useStartup, useFiles, useMemos, useSignals, usePublishMemo } from "../lib/hooks.js";
import { Card, ScorePill, Badge, Empty, c, pageStyle } from "../lib/ui.js";

export function DossierPage() {
  const { id } = useParams();
  const { data, isLoading } = useStartup(id);
  const files = useFiles(id);
  const memos = useMemos(id);
  const signals = useSignals(id);
  const publish = usePublishMemo();

  if (isLoading) return <Empty>Loading…</Empty>;
  const s = data?.data;
  if (!s) return <Empty>Startup not found.</Empty>;
  const d: StartupDossier | null = s.dossier;
  const fit = d?.fit;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <Link to="/vcbrain/pipeline" style={{ color: c.muted, fontSize: 12, textDecoration: "none" }}>
          ← Pipeline
        </Link>

        {/* ── Header ─────────────────────────────────────────────── */}
        <Card style={{ marginTop: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <Monogram text={d?.header?.monogram ?? s.name.slice(0, 2).toUpperCase()} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{s.name}</h1>
                  <div style={{ color: c.accent, fontSize: 14, marginTop: 2 }}>{d?.header?.positioning ?? s.oneLiner}</div>
                  {d?.header?.tagline && <div style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>“{d.header.tagline}”</div>}
                  <div style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>
                    {[d?.header?.category, d?.header?.stage, d?.header?.hq, d?.header?.founded && `est. ${d.header.founded}`, `${s.stage} · ${s.sourceChannel}`]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Fit</div>
                  <ScorePill score={s.fitScore} />
                  {fit?.conviction && <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{fit.conviction} conviction</div>}
                </div>
              </div>
              {d?.header?.tags?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {d.header.tags.map((t, i) => (
                    <span key={i} style={{ ...tagStyle, ...(t.accent ? { borderColor: c.accent, color: c.accent } : {}) }}>
                      {t.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {d?.header?.quickStats && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
              {Object.entries(d.header.quickStats)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <MiniStat key={k} label={labelize(k)} value={String(v)} />
                ))}
            </div>
          )}
          {(d?.model || d?.sourceCount || d?.completeness != null) && (
            <div style={{ marginTop: 10, fontSize: 11, color: c.muted }}>
              Researched by Hebbs.ai{d?.model ? ` with ${d.model}` : ""}
              {d?.sourceCount ? ` · ${d.sourceCount} sources` : ""}
              {d?.completeness != null ? ` · ${d.completeness}% complete` : ""}
              {d?.enrichedAt ? ` · ${new Date(d.enrichedAt).toLocaleDateString()}` : ""}
            </div>
          )}
        </Card>

        {/* ── Alerts (actionable, up top) ────────────────────────── */}
        {d?.alerts?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {d.alerts.map((a, i) => (
              <AlertRow key={i} a={a} />
            ))}
          </div>
        ) : null}

        {/* ── Snapshot ───────────────────────────────────────────── */}
        {d?.snapshot && (
          <Section title="Analyst snapshot">
            {d.snapshot.thesis && <P bold>{d.snapshot.thesis}</P>}
            <KV k="What they do" v={d.snapshot.whatTheyDo} />
            <KV k="Why now" v={d.snapshot.whyNow} />
            <KV k="Recommendation" v={d.snapshot.recommendation} />
          </Section>
        )}

        {/* ── Metrics ────────────────────────────────────────────── */}
        {d?.metrics?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
            {d.metrics.map((m, i) => (
              <MetricCard key={i} m={m} />
            ))}
          </div>
        ) : null}

        {/* ── Thesis fit ─────────────────────────────────────────── */}
        {fit && (
          <Section title="Thesis fit">
            {fit.dimensionScores && (
              <div style={{ marginBottom: 10 }}>
                {(["team", "market", "product"] as const).map((dim) =>
                  fit.dimensionScores?.[dim] != null ? <Bar key={dim} label={dim} value={fit.dimensionScores[dim]!} /> : null,
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <Bullets title="Fits" items={fit.fits} color="#16a34a" />
              <Bullets title="Risks" items={fit.risks} color="#dc2626" />
            </div>
            {fit.failedMustHaves?.length ? <Bullets title="Failed must-haves" items={fit.failedMustHaves} color="#dc2626" /> : null}
            {fit.comps?.length ? (
              <KVBlock title="Comps">
                {fit.comps.map((cp, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                    <b>{cp.company}</b>
                    {cp.outcome ? ` — ${cp.outcome}` : ""} {cp.relevance ? <span style={{ color: c.muted }}>({cp.relevance})</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            {fit.returnScenarios?.length ? (
              <KVBlock title="Return scenarios">
                {fit.returnScenarios.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                    <b>{r.scenario}</b> {r.multiple ? <span style={{ color: c.accent }}>{r.multiple}</span> : null}
                    {r.rationale ? <span style={{ color: c.muted }}> — {r.rationale}</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            <div style={{ marginTop: 8, fontSize: 13, color: c.muted, display: "flex", gap: 18, flexWrap: "wrap" }}>
              {fit.suggestedLeadPartner && <span>Lead: <span style={{ color: c.text }}>{fit.suggestedLeadPartner}</span></span>}
              {fit.ownershipTarget && <span>Target ownership: <span style={{ color: c.text }}>{fit.ownershipTarget}</span></span>}
            </div>
          </Section>
        )}

        {/* ── Founders ───────────────────────────────────────────── */}
        {d?.team?.founders?.length ? (
          <Section title={`Team${d.team.size ? ` · ${d.team.size}` : ""}`}>
            {d.team.founderMarketFit && <P>{d.team.founderMarketFit}</P>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {d.team.founders.map((f, i) => (
                <FounderCard key={i} f={f} />
              ))}
            </div>
            {d.team.keyHires?.length ? (
              <KVBlock title="Key hires">
                {d.team.keyHires.map((h, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    <b>{h.name}</b> {h.role ? `· ${h.role}` : ""} {h.background ? <span style={{ color: c.muted }}>— {h.background}</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            {d.team.gaps?.length ? <BulletList label="Gaps" items={d.team.gaps} /> : null}
          </Section>
        ) : null}

        {/* ── Two-column body ────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {d?.product && (
            <Section title="Product">
              <P>{d.product.summary}</P>
              <KV k="Problem" v={d.product.problem} />
              <KV k="Solution" v={d.product.solution} />
              <KV k="How it works" v={d.product.howItWorks} />
              <KV k="Moat" v={d.product.moat} />
              <BulletList label="Differentiators" items={d.product.differentiators} />
              {d.product.ip?.length ? (
                <BulletList label="IP" items={d.product.ip.map((x) => `${x.type}${x.status ? ` (${x.status})` : ""}${x.detail ? ` — ${x.detail}` : ""}`)} />
              ) : null}
              <Chips label="Tech" items={d.product.techStack} />
              <Chips label="Integrations" items={d.product.integrations} />
            </Section>
          )}
          {d?.market && (
            <Section title="Market">
              <P>{d.market.summary}</P>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniStat label="TAM" value={d.market.tam} />
                <MiniStat label="SAM" value={d.market.sam} />
                <MiniStat label="Growth" value={d.market.growthRate} />
              </div>
              <KV k="Why now" v={d.market.whyNow ?? d.market.timing} />
              <KV k="ICP" v={d.market.icp} />
              <KV k="Regulatory" v={d.market.regulatory} />
              <BulletList label="Tailwinds" items={d.market.tailwinds} />
              <BulletList label="Headwinds" items={d.market.headwinds} />
            </Section>
          )}
          {d?.competition && (
            <Section title="Competition">
              <KV k="Positioning" v={d.competition.positioning} />
              <KV k="Moat vs field" v={d.competition.moatVsCompetition} />
              {d.competition.direct?.length ? (
                <KVBlock title="Direct">
                  {d.competition.direct.map((x, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                      <b>{x.name}</b> {x.funding ? <span style={{ color: c.muted }}>({x.funding})</span> : null}
                      {x.vsThem ? <span style={{ color: c.muted }}> — {x.vsThem}</span> : null}
                    </div>
                  ))}
                </KVBlock>
              ) : null}
              <BulletList label="Substitutes" items={d.competition.substitutes} />
              <BulletList label="Barriers to entry" items={d.competition.barriersToEntry} />
            </Section>
          )}
          {d?.traction && (
            <Section title="Traction">
              <P>{d.traction.summary}</P>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniStat label="ARR" value={d.traction.revenue?.arr} />
                <MiniStat label="MRR" value={d.traction.revenue?.mrr} />
                <MiniStat label="GMV" value={d.traction.revenue?.gmv} />
                <MiniStat label="MoM" value={d.traction.growth?.mom} />
                <MiniStat label="YoY" value={d.traction.growth?.yoy} />
                <MiniStat label="NRR" value={d.traction.retention?.nrr} />
                <MiniStat label="Churn" value={d.traction.retention?.grossChurn} />
                <MiniStat label="NPS" value={d.traction.engagement?.nps} />
              </div>
              {d.traction.unitEconomics && (
                <KVBlock title="Unit economics">
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <MiniStat label="CAC" value={d.traction.unitEconomics.cac} />
                    <MiniStat label="LTV" value={d.traction.unitEconomics.ltv} />
                    <MiniStat label="LTV:CAC" value={d.traction.unitEconomics.ltvCacRatio} />
                    <MiniStat label="Payback" value={d.traction.unitEconomics.paybackMonths} />
                    <MiniStat label="Gross margin" value={d.traction.unitEconomics.grossMargin} />
                    <MiniStat label="Burn mult." value={d.traction.unitEconomics.burnMultiple} />
                    <MiniStat label="Magic #" value={d.traction.unitEconomics.magicNumber} />
                  </div>
                </KVBlock>
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
                <MiniStat label="Monthly burn" value={d.traction.burn?.monthly} />
                <MiniStat label="Runway" value={d.traction.burn?.runwayMonths} />
                <MiniStat label="Customers" value={d.traction.customers?.count} />
              </div>
              <KV k="Concentration" v={d.traction.customers?.concentration} />
              <BulletList label="Notable customers" items={d.traction.customers?.notable} />
              {d.traction.milestones?.length ? (
                <BulletList label="Milestones" items={d.traction.milestones.map((m) => `${m.date ? `${m.date}: ` : ""}${m.event}`)} />
              ) : null}
            </Section>
          )}
          {d?.round && (
            <Section title="The round">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniStat label="Raising" value={d.round.raising} />
                <MiniStat label="Valuation" value={d.round.valuation} />
                <MiniStat label="Instrument" value={d.round.instrument} />
                <MiniStat label="Lead" value={d.round.leadStatus} />
              </div>
              <KV k="Use of funds" v={d.round.useOfFunds} />
              <KV k="Runway post-raise" v={d.round.runwayPostRaise} />
              <KV k="Total raised" v={d.round.totalRaised} />
              <KV k="Cap table" v={d.round.capTableNotes} />
              <Chips label="Existing investors" items={d.round.existingInvestors} />
              <Chips label="Notable angels" items={d.round.notableAngels} />
              {d.round.priorRounds?.length ? (
                <KVBlock title="Prior rounds">
                  {d.round.priorRounds.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>
                      {r.date ? `${r.date} · ` : ""}
                      <b>{r.stage}</b> {r.amount ? `· ${r.amount}` : ""} {r.valuation ? `@ ${r.valuation}` : ""}
                      {r.leadInvestors?.length ? <span style={{ color: c.muted }}> — {r.leadInvestors.join(", ")}</span> : null}
                    </div>
                  ))}
                </KVBlock>
              ) : null}
            </Section>
          )}
        </div>

        {/* ── Diligence plan ─────────────────────────────────────── */}
        {d?.diligence && (
          <Section title="Diligence plan">
            {d.diligence.redFlags?.length ? (
              <KVBlock title="Red flags">
                {d.diligence.redFlags.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <SevDot s={r.severity} /> <b>{r.item}</b> {r.detail ? <span style={{ color: c.muted }}>— {r.detail}</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            {d.diligence.keyRisks?.length ? (
              <KVBlock title="Key risks">
                {d.diligence.keyRisks.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <Badge>{r.category}</Badge> {r.risk}
                    {r.mitigation ? <span style={{ color: c.muted }}> · mitigation: {r.mitigation}</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            <BulletList label="Open questions" items={d.diligence.openQuestions} />
            {d.diligence.checklist?.length ? (
              <KVBlock title="Checklist">
                {d.diligence.checklist.map((x, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    <Badge>{x.status ?? "todo"}</Badge> {x.area} {x.note ? <span style={{ color: c.muted }}>— {x.note}</span> : null}
                  </div>
                ))}
              </KVBlock>
            ) : null}
            <BulletList label="References to check" items={d.diligence.referencesToCheck} />
          </Section>
        )}

        {/* ── Signals / digital / network / recognition ──────────── */}
        {d?.signals?.length ? (
          <Section title="Signals">
            {d.signals.map((sig, i) => (
              <div key={i} style={{ fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${c.border}` }}>
                <Badge>{sig.type}</Badge> {sig.date ? <span style={{ color: c.muted }}>{sig.date} · </span> : null}
                <b>{sig.headline}</b> {sig.detail ? <span style={{ color: c.muted }}>— {sig.detail}</span> : null}
              </div>
            ))}
          </Section>
        ) : null}

        {d?.digital?.length ? (
          <Section title="Digital footprint">
            {d.digital.map((x, i) => (
              <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>
                <b>{x.platform}</b> {x.handle ? `@${x.handle}` : ""} {x.metric ? <span style={{ color: c.accent }}>· {x.metric}</span> : null}
                {x.note ? <span style={{ color: c.muted }}> ({x.note})</span> : null}
              </div>
            ))}
          </Section>
        ) : null}

        {d?.network && (d.network.warmIntroPaths?.length || d.network.referredBy || d.network.partnerNotes) ? (
          <Section title="Network & relationship">
            <KV k="Referred by" v={d.network.referredBy} />
            <KV k="Relationship to fund" v={d.network.relationshipToFund} />
            <BulletList label="Warm-intro paths" items={d.network.warmIntroPaths} />
            <BulletList label="Mutual connections" items={d.network.mutualConnections} />
            <KV k="Partner notes" v={d.network.partnerNotes} />
          </Section>
        ) : null}

        {d?.recognition?.length ? (
          <Section title="Recognition">
            {d.recognition.map((r, i) => (
              <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>
                {r.year ? <b>{r.year}</b> : null} {r.title} {r.description ? <span style={{ color: c.muted }}>— {r.description}</span> : null}
              </div>
            ))}
          </Section>
        ) : null}

        {d?.timeline?.length ? (
          <Section title="Timeline">
            {d.timeline.map((t, i) => (
              <div key={i} style={{ fontSize: 13, padding: "4px 0", borderLeft: `2px solid ${c.border}`, paddingLeft: 10, marginBottom: 4 }}>
                {t.date ? <b>{t.date}</b> : null} {t.title} {t.body ? <span style={{ color: c.muted }}>— {t.body}</span> : null}
              </div>
            ))}
          </Section>
        ) : null}

        {/* ── Files ──────────────────────────────────────────────── */}
        <Section title="Files">
          {files.data?.data?.length ? (
            files.data.data.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>
                  {f.filename} <Badge>{f.kind}</Badge>
                </span>
                <span style={{ color: c.muted, fontSize: 11 }}>{f.parsedAt ? "scanned" : "pending"}</span>
              </div>
            ))
          ) : (
            <Empty>No files yet.</Empty>
          )}
        </Section>

        {/* ── Memos ──────────────────────────────────────────────── */}
        <Section title="IC memos">
          {memos.data?.data?.length ? (
            memos.data.data.map((m) => (
              <Card key={m.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Badge>{m.status}</Badge>
                  {m.status !== "published" && (
                    <button onClick={() => publish.mutate({ id: m.id })} style={publishBtn}>
                      Publish
                    </button>
                  )}
                </div>
                <Markdown>{m.draftMd}</Markdown>
              </Card>
            ))
          ) : (
            <Empty>No memo yet — reaches IC stage to trigger vc-memo-writer.</Empty>
          )}
        </Section>

        {/* ── Portfolio signals ──────────────────────────────────── */}
        {signals.data?.data?.length ? (
          <Section title="Portfolio signals">
            {signals.data.data.map((sig) => (
              <div key={sig.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>
                  <Badge>{sig.severity}</Badge> {sig.signalType}
                </span>
                <span style={{ color: c.muted, fontSize: 11 }}>{new Date(sig.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </Section>
        ) : null}

        {/* ── Sources ────────────────────────────────────────────── */}
        {d?.sources?.length ? (
          <Section title={`Sources (${d.sources.length})`}>
            {d.sources.map((src: Source) => (
              <div key={src.id} style={{ fontSize: 12, padding: "3px 0", color: c.muted }}>
                <Badge>{src.tier}</Badge> <span style={{ color: c.text }}>{src.title}</span>
                {src.contribution ? ` — ${src.contribution}` : ""}
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noreferrer" style={{ color: c.accent, marginLeft: 6 }}>
                    link
                  </a>
                ) : null}
              </div>
            ))}
          </Section>
        ) : null}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ marginTop: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 10px" }}>{title}</h2>
      {children}
    </Card>
  );
}

// Themed markdown for IC memos — readable headings, lists, emphasis, code.
function Markdown({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 13, color: c.text, lineHeight: 1.55, marginTop: 8 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <div style={{ fontSize: 18, fontWeight: 700, margin: "10px 0 6px" }}>{children}</div>,
          h2: ({ children }) => <div style={{ fontSize: 14, fontWeight: 700, margin: "14px 0 4px", color: c.text, borderBottom: `1px solid ${c.border}`, paddingBottom: 3 }}>{children}</div>,
          h3: ({ children }) => <div style={{ fontSize: 13, fontWeight: 600, margin: "10px 0 3px" }}>{children}</div>,
          p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: c.accent }}>{children}</a>,
          code: ({ children }) => <code style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, padding: "0 4px", fontSize: 12 }}>{children}</code>,
          hr: () => <hr style={{ border: "none", borderTop: `1px solid ${c.border}`, margin: "10px 0" }} />,
          table: ({ children }) => <table style={{ borderCollapse: "collapse", fontSize: 12, margin: "0 0 8px" }}>{children}</table>,
          th: ({ children }) => <th style={{ border: `1px solid ${c.border}`, padding: "3px 8px", textAlign: "left", color: c.muted }}>{children}</th>,
          td: ({ children }) => <td style={{ border: `1px solid ${c.border}`, padding: "3px 8px" }}>{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Monogram({ text }: { text: string }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 18,
        color: c.accent,
        flexShrink: 0,
      }}
    >
      {text}
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  const arrow = m.trend === "up" ? "▲" : m.trend === "down" ? "▼" : "";
  const arrowColor = m.trend === "up" ? "#16a34a" : m.trend === "down" ? "#dc2626" : c.muted;
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{m.label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
        {m.value}
        {m.unit ? <span style={{ fontSize: 12, color: c.muted, fontWeight: 400 }}> {m.unit}</span> : null}
        {arrow ? <span style={{ fontSize: 12, color: arrowColor, marginLeft: 6 }}>{arrow}</span> : null}
      </div>
      {m.subtitle && <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{m.subtitle}</div>}
    </Card>
  );
}

function FounderCard({ f }: { f: FounderProfile }) {
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 600 }}>
          {f.name} {f.role ? <span style={{ color: c.muted, fontWeight: 400 }}>· {f.role}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {f.linkedin && <Ext href={f.linkedin} label="in" />}
          {f.twitter && <Ext href={f.twitter} label="x" />}
          {f.github && <Ext href={f.github} label="gh" />}
        </div>
      </div>
      {f.positioning && <div style={{ fontSize: 12, color: c.accent, marginTop: 3 }}>{f.positioning}</div>}
      {f.background && <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{f.background}</div>}
      <KV k="Founder-market fit" v={f.founderMarketFit} />
      <KV k="Domain" v={f.domainExpertise} />
      {f.education?.length ? <BulletList label="Education" items={f.education} /> : null}
      {f.priorCompanies?.length ? (
        <BulletList label="Prior" items={f.priorCompanies.map((p) => `${p.name}${p.role ? ` (${p.role})` : ""}${p.outcome ? ` — ${p.outcome}` : ""}`)} />
      ) : null}
      {f.priorExits?.length ? <BulletList label="Exits" items={f.priorExits} /> : null}
      {f.notable?.length ? <BulletList label="Notable" items={f.notable} /> : null}
      {f.reputation && <KV k="Reputation" v={f.reputation} />}
      {f.quotes?.length ? (
        <div style={{ marginTop: 6 }}>
          {f.quotes.map((q, i) => (
            <div key={i} style={{ fontSize: 12, fontStyle: "italic", color: c.muted }}>
              “{q.text}”{q.source ? ` — ${q.source}` : ""}
            </div>
          ))}
        </div>
      ) : null}
      {f.redFlags?.length ? <BulletList label="⚠ Flags" items={f.redFlags} /> : null}
    </div>
  );
}

function AlertRow({ a }: { a: Alert }) {
  const color = a.severity === "flag" ? "#dc2626" : a.severity === "watch" ? "#d97706" : c.accent;
  return (
    <div style={{ borderLeft: `3px solid ${color}`, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{a.hook}</div>
      <div style={{ fontSize: 13, color: c.text, marginTop: 2 }}>{a.detail}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const band = value >= 70 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
      <span style={{ width: 70, fontSize: 12, textTransform: "capitalize", color: c.muted }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: c.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: band }} />
      </div>
      <span style={{ width: 28, textAlign: "right", fontSize: 12 }}>{value}</span>
    </div>
  );
}

function Ext({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: c.accent, textDecoration: "none", border: `1px solid ${c.border}`, borderRadius: 5, padding: "0 5px" }}>
      {label}
    </a>
  );
}

function SevDot({ s }: { s?: "low" | "medium" | "high" }) {
  const color = s === "high" ? "#dc2626" : s === "medium" ? "#d97706" : c.muted;
  return <span style={{ color, fontWeight: 700 }}>●</span>;
}

function MiniStat({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, color: c.text, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function P({ children, bold }: { children?: React.ReactNode; bold?: boolean }) {
  if (!children) return null;
  return <div style={{ fontSize: 13, marginBottom: 8, fontWeight: bold ? 600 : 400, lineHeight: 1.5 }}>{children}</div>;
}

function KV({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>
      <span style={{ color: c.muted }}>{k}: </span>
      {v}
    </div>
  );
}

function KVBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function Bullets({ title, items, color }: { title: string; items?: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BulletList({ label, items }: { label?: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 6 }}>
      {label && <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>}
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, marginBottom: 3 }}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it, i) => (
          <span key={i} style={tagStyle}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function labelize(k: string) {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase());
}

const tagStyle: React.CSSProperties = {
  fontSize: 11,
  color: c.muted,
  border: `1px solid ${c.border}`,
  borderRadius: 6,
  padding: "2px 8px",
};
const publishBtn: React.CSSProperties = {
  fontSize: 12,
  background: c.accent,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "2px 10px",
  cursor: "pointer",
};
