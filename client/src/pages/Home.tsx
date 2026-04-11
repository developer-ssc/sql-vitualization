/*
Style reminder — Cartographic Workshop:
Asymmetric drafting-table composition, warm paper tones, precise technical annotation, and calm editorial hierarchy.
Every panel should feel like part of a schema workshop rather than a generic dashboard.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  AlertCircle,
  Copy,
  Database,
  GitBranch,
  FileCode2,
  FileUp,
  KeyRound,
  Loader2,
  Network,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { parseSqlToSchema, SAMPLE_SQL } from "@/lib/sqlToSchema";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663446833182/NXK7Pkq7Htvqj9jcF7hrYq/sql-vitualization-hero-hCBDcRXzbvx7hTj6fzC3YS.webp";
const PANEL_TEXTURE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663446833182/NXK7Pkq7Htvqj9jcF7hrYq/sql-vitualization-panel-texture-RT229WFXCB8C9tGCB58MdH.webp";
const DIAGRAM_ACCENT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663446833182/NXK7Pkq7Htvqj9jcF7hrYq/sql-vitualization-diagram-accent-9sXoBNEQ7mjj2ZWxqqBKG7.webp";

type ViewMode = "diagram" | "schema" | "source";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "neutral",
  er: {
    useMaxWidth: false,
  },
  themeVariables: {
    primaryColor: "#f5eedf",
    primaryTextColor: "#1d2a2d",
    primaryBorderColor: "#3d4f54",
    lineColor: "#5c7571",
    tertiaryColor: "#e3d7be",
    background: "#fbf7ee",
    fontFamily: "IBM Plex Sans",
  },
});

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied.`);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[rgba(37,55,58,0.16)] bg-white/80 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-[#314447] uppercase transition hover:-translate-y-0.5 hover:border-[#51706b] hover:bg-white"
    >
      <Copy className="h-3.5 w-3.5" />
      Copy
    </button>
  );
}

export default function Home() {
  const [sqlText, setSqlText] = useState(SAMPLE_SQL);
  const [fileName, setFileName] = useState("sample-schema.sql");
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  const [renderedSvg, setRenderedSvg] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string>("");
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseSqlToSchema(sqlText), [sqlText]);

  const summary = useMemo(() => {
    const relationshipCount = parsed.tables.reduce((count, table) => count + table.foreignKeys.length, 0);
    const columnCount = parsed.tables.reduce((count, table) => count + table.columns.length, 0);
    return {
      tableCount: parsed.tables.length,
      columnCount,
      relationshipCount,
    };
  }, [parsed.tables]);

  useEffect(() => {
    if (!activeTable && parsed.tables[0]) {
      setActiveTable(parsed.tables[0].name);
      return;
    }

    if (activeTable && !parsed.tables.some((table) => table.name === activeTable)) {
      setActiveTable(parsed.tables[0]?.name ?? null);
    }
  }, [activeTable, parsed.tables]);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!parsed.tables.length) {
        setRenderedSvg("");
        setRenderError(parsed.warnings[0] ?? "No schema found.");
        return;
      }

      setIsRendering(true);
      setRenderError("");

      try {
        const result = await mermaid.render(`sql-vitualization-${Date.now()}`, parsed.mermaid);
        if (!cancelled) {
          setRenderedSvg(result.svg);
          setRenderError("");
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to render the ER diagram.";
          setRenderedSvg("");
          setRenderError(message);
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [parsed.mermaid, parsed.tables.length, parsed.warnings]);

  useEffect(() => {
    if (diagramRef.current && renderedSvg) {
      diagramRef.current.innerHTML = renderedSvg;
    }
  }, [renderedSvg]);

  const selectedTable = parsed.tables.find((table) => table.name === activeTable) ?? parsed.tables[0];

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    setSqlText(content);
    setFileName(file.name);
    toast.success(`Loaded ${file.name}`);
  }

  function handleLoadSample() {
    setSqlText(SAMPLE_SQL);
    setFileName("sample-schema.sql");
    toast.success("Sample schema loaded.");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4efe2] text-[#1f2b2e]">
      <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply" style={{ backgroundImage: `url(${PANEL_TEXTURE})`, backgroundSize: "920px auto" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(104,139,132,0.16),transparent_46%),radial-gradient(circle_at_top_right,rgba(196,131,104,0.14),transparent_42%)]" />

      <main className="relative">
        <section className="border-b border-[rgba(37,55,58,0.12)]">
          <div className="container grid gap-10 py-8 lg:grid-cols-[1.05fr_1.2fr] lg:items-start lg:py-12">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(37,55,58,0.14)] bg-white/70 px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.32em] text-[#45605c] shadow-[0_8px_30px_rgba(31,43,46,0.06)] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Cartographic Workshop Edition
              </div>

              <div className="space-y-5">
                <p className="text-[0.78rem] uppercase tracking-[0.3em] text-[#6d807d]">SQL file to entity relationship map</p>
                <h1 className="max-w-3xl font-[Fraunces] text-5xl leading-none text-[#1e2f31] sm:text-6xl">
                  Turn a schema dump into a readable ER diagram directly in the browser.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#42585a]">
                  Upload a local <strong>.sql</strong> file, extract tables and foreign keys, then inspect the resulting entity map, relational summary, and Mermaid source without a backend.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Tables", value: summary.tableCount, icon: Database },
                  { label: "Columns", value: summary.columnCount, icon: FileCode2 },
                  { label: "Links", value: summary.relationshipCount, icon: Network },
                ].map((item) => (
                  <div key={item.label} className="draft-card p-5">
                    <div className="mb-4 inline-flex rounded-full border border-[rgba(37,55,58,0.16)] bg-[#f5f0e4] p-2 text-[#35514f]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="text-3xl font-semibold text-[#1c2a2c]">{item.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-[#6c7e7b]">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-[#294547] bg-[#244044] px-5 py-3 text-sm font-medium text-[#f7f2e7] shadow-[0_18px_45px_rgba(36,64,68,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1e3539]">
                  <FileUp className="h-4 w-4" />
                  Upload SQL file
                  <input type="file" accept=".sql,text/sql" className="hidden" onChange={handleFileUpload} />
                </label>
                <button type="button" onClick={handleLoadSample} className="ink-button">
                  Load sample schema
                </button>
                <CopyButton value={parsed.mermaid} label="Mermaid diagram source" />
              </div>
            </div>

            <div className="relative min-h-[26rem] overflow-hidden rounded-[2rem] border border-[rgba(37,55,58,0.14)] bg-[#ece3d1] p-5 shadow-[0_30px_80px_rgba(36,52,52,0.14)]">
              <div className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(244,239,226,0.96)_12%,rgba(244,239,226,0.62)_44%,rgba(244,239,226,0.18)_100%)]" />
              <div className="relative grid h-full items-end gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4 rounded-[1.6rem] border border-[rgba(37,55,58,0.12)] bg-[rgba(251,247,238,0.84)] p-6 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#6b7d79]">Current input</p>
                  <div>
                    <div className="text-2xl font-semibold text-[#1c2b2d]">{fileName}</div>
                    <p className="mt-2 text-sm leading-7 text-[#4d6264]">
                      This interface reads schema statements in the browser, reconstructs table structure, and converts detected keys into a diagram-friendly model.
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-[#334b4d] sm:grid-cols-2">
                    <div className="rounded-2xl border border-[rgba(37,55,58,0.12)] bg-white/72 p-4">
                      <div className="text-[0.72rem] uppercase tracking-[0.24em] text-[#70827f]">Dialect hint</div>
                      <div className="mt-2 font-medium">{parsed.sourceDialectHint}</div>
                    </div>
                    <div className="rounded-2xl border border-[rgba(37,55,58,0.12)] bg-white/72 p-4">
                      <div className="text-[0.72rem] uppercase tracking-[0.24em] text-[#70827f]">Parser scope</div>
                      <div className="mt-2 font-medium">CREATE TABLE + ALTER TABLE keys</div>
                    </div>
                  </div>
                </div>

                <div className="justify-self-end">
                  <img
                    src={DIAGRAM_ACCENT}
                    alt="Abstract technical ER poster"
                    className="max-h-[26rem] w-full max-w-[18rem] object-contain drop-shadow-[0_24px_34px_rgba(36,52,52,0.18)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container grid gap-6 py-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:py-10">
          <aside className="space-y-6">
            <div className="draft-card p-5">
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(37,55,58,0.1)] pb-4">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Inspection rail</p>
                  <h2 className="mt-2 font-[Fraunces] text-2xl text-[#213336]">Tables</h2>
                </div>
                <div className="rounded-full border border-[rgba(37,55,58,0.14)] bg-[#f4ecdd] px-3 py-1 text-xs font-medium text-[#47615d]">
                  {parsed.tables.length}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {parsed.tables.length ? (
                  parsed.tables.map((table) => {
                    const isActive = table.name === selectedTable?.name;
                    return (
                      <button
                        key={table.name}
                        type="button"
                        onClick={() => setActiveTable(table.name)}
                        className={`w-full rounded-[1.2rem] border p-4 text-left transition ${
                          isActive
                            ? "border-[#42625e] bg-[#f3ede0] shadow-[0_12px_28px_rgba(35,52,52,0.1)]"
                            : "border-[rgba(37,55,58,0.1)] bg-white/66 hover:-translate-y-0.5 hover:border-[rgba(37,55,58,0.2)] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-[#233739]">{table.name}</div>
                          <div className="text-[0.72rem] uppercase tracking-[0.18em] text-[#70827f]">{table.columns.length} cols</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-[#55706b]">
                          <span className="rounded-full border border-[rgba(37,55,58,0.12)] px-2.5 py-1">PK {table.primaryKeys.length}</span>
                          <span className="rounded-full border border-[rgba(37,55,58,0.12)] px-2.5 py-1">FK {table.foreignKeys.length}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-[rgba(37,55,58,0.16)] bg-[#fbf8f0] p-5 text-sm leading-7 text-[#576a67]">
                    Upload a schema file to populate this inspection rail.
                  </div>
                )}
              </div>
            </div>

            <div className="draft-card p-5">
              <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Parser warnings</p>
              <div className="mt-4 space-y-3">
                {parsed.warnings.length ? (
                  parsed.warnings.map((warning) => (
                    <div key={warning} className="flex gap-3 rounded-2xl border border-[rgba(164,110,83,0.22)] bg-[rgba(206,166,141,0.12)] p-4 text-sm leading-7 text-[#694a3f]">
                      <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[rgba(37,55,58,0.1)] bg-white/68 p-4 text-sm leading-7 text-[#536765]">
                    No parser warnings for the current schema.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="draft-card overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-[rgba(37,55,58,0.1)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Main chamber</p>
                  <h2 className="mt-2 font-[Fraunces] text-3xl text-[#203134]">ER rendering workspace</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "diagram", label: "Diagram", icon: GitBranch },
                    { id: "schema", label: "Schema", icon: Database },
                    { id: "source", label: "Mermaid", icon: FileCode2 },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setViewMode(item.id as ViewMode)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        viewMode === item.id
                          ? "bg-[#244044] text-[#f8f3e8] shadow-[0_14px_30px_rgba(36,64,68,0.18)]"
                          : "border border-[rgba(37,55,58,0.14)] bg-white/75 text-[#36504e] hover:border-[#5b7874]"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-h-[38rem] bg-[linear-gradient(180deg,rgba(251,247,238,0.9),rgba(246,239,225,0.92))] p-6">
                  {viewMode === "diagram" ? (
                    <div className="relative h-full overflow-hidden rounded-[1.6rem] border border-[rgba(37,55,58,0.1)] bg-[#fbf7ee] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      {isRendering ? (
                        <div className="flex h-full min-h-[30rem] items-center justify-center gap-3 text-[#4b6461]">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Rendering diagram…
                        </div>
                      ) : renderError ? (
                        <div className="flex h-full min-h-[30rem] flex-col items-center justify-center gap-4 text-center text-[#5c4a44]">
                          <AlertCircle className="h-8 w-8" />
                          <div className="max-w-lg text-sm leading-7">{renderError}</div>
                        </div>
                      ) : (
                        <div className="diagram-scroll h-full overflow-auto rounded-[1.2rem] border border-[rgba(37,55,58,0.08)] bg-white/70 p-4">
                          <div ref={diagramRef} className="diagram-frame min-w-[46rem]" />
                        </div>
                      )}
                    </div>
                  ) : null}

                  {viewMode === "schema" ? (
                    <div className="grid gap-4">
                      {parsed.tables.map((table) => (
                        <article key={table.name} className="rounded-[1.6rem] border border-[rgba(37,55,58,0.1)] bg-white/74 p-5 shadow-[0_14px_30px_rgba(35,52,52,0.06)]">
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(37,55,58,0.08)] pb-4">
                            <div>
                              <h3 className="font-[Fraunces] text-2xl text-[#213235]">{table.name}</h3>
                              <p className="mt-1 text-sm text-[#5b6c68]">{table.columns.length} columns · {table.foreignKeys.length} relationships</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-[#55706b]">
                              {table.primaryKeys.length ? <span className="rounded-full border border-[rgba(37,55,58,0.12)] px-3 py-1">PK {table.primaryKeys.join(", ")}</span> : null}
                              {table.uniqueColumns.length ? <span className="rounded-full border border-[rgba(37,55,58,0.12)] px-3 py-1">UQ {table.uniqueColumns.length}</span> : null}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3">
                            {table.columns.map((column) => (
                              <div key={`${table.name}-${column.name}`} className="grid gap-2 rounded-2xl border border-[rgba(37,55,58,0.08)] bg-[#fcfaf4] px-4 py-3 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
                                <div>
                                  <div className="font-medium text-[#253739]">{column.name}</div>
                                  <div className="mt-1 font-mono text-xs text-[#6a7d79]">{column.rawType}</div>
                                </div>
                                <div className="text-sm text-[#49615d]">
                                  {column.references ? `References ${column.references.table}.${column.references.column}` : column.defaultValue ? `Default ${column.defaultValue}` : column.notNull ? "Required" : "Nullable"}
                                </div>
                                <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-[#49615d]">
                                  {column.isPrimaryKey ? <span className="rounded-full bg-[#294547] px-2.5 py-1 text-[#f6f1e7]">PK</span> : null}
                                  {column.isForeignKey ? <span className="rounded-full bg-[#597670] px-2.5 py-1 text-[#f6f1e7]">FK</span> : null}
                                  {column.isUnique && !column.isPrimaryKey ? <span className="rounded-full bg-[#d6c4a8] px-2.5 py-1 text-[#3a2f29]">UQ</span> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {viewMode === "source" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[1.6rem] border border-[rgba(37,55,58,0.1)] bg-white/74 p-5 shadow-[0_14px_30px_rgba(35,52,52,0.06)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Mermaid source</p>
                            <h3 className="mt-2 font-[Fraunces] text-2xl text-[#213235]">Generated diagram code</h3>
                          </div>
                          <CopyButton value={parsed.mermaid} label="Mermaid source" />
                        </div>
                        <pre className="max-h-[32rem] overflow-auto rounded-[1.3rem] border border-[rgba(37,55,58,0.08)] bg-[#f7f2e8] p-4 font-['IBM_Plex_Mono'] text-xs leading-6 text-[#314447]">{parsed.mermaid}</pre>
                      </div>
                      <div className="rounded-[1.6rem] border border-[rgba(37,55,58,0.1)] bg-white/74 p-5 shadow-[0_14px_30px_rgba(35,52,52,0.06)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Relational summary</p>
                            <h3 className="mt-2 font-[Fraunces] text-2xl text-[#213235]">Parsed schema notes</h3>
                          </div>
                          <CopyButton value={parsed.relationalSchema} label="Relational schema summary" />
                        </div>
                        <pre className="max-h-[32rem] overflow-auto rounded-[1.3rem] border border-[rgba(37,55,58,0.08)] bg-[#f7f2e8] p-4 font-['IBM_Plex_Mono'] text-xs leading-6 text-[#314447]">{parsed.relationalSchema || "No schema summary yet."}</pre>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-[rgba(37,55,58,0.1)] bg-[rgba(243,236,223,0.78)] p-6 xl:border-l xl:border-t-0">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[#72837d]">Source editor</p>
                      <h3 className="mt-2 font-[Fraunces] text-2xl text-[#213235]">Working SQL</h3>
                    </div>

                    <textarea
                      value={sqlText}
                      onChange={(event) => setSqlText(event.target.value)}
                      spellCheck={false}
                      className="min-h-[18rem] w-full rounded-[1.6rem] border border-[rgba(37,55,58,0.12)] bg-[#fbf7ee] px-4 py-4 font-['IBM_Plex_Mono'] text-xs leading-6 text-[#314447] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-[#56716d] focus:ring-4 focus:ring-[rgba(86,113,109,0.12)]"
                    />

                    <div className="rounded-[1.5rem] border border-[rgba(37,55,58,0.1)] bg-white/72 p-5">
                      <div className="mb-3 flex items-center gap-2 text-[#294547]">
                        <KeyRound className="h-4 w-4" />
                        <span className="text-sm font-medium">Selected table</span>
                      </div>
                      {selectedTable ? (
                        <div className="space-y-3 text-sm leading-7 text-[#4b5f5c]">
                          <div>
                            <div className="font-semibold text-[#213336]">{selectedTable.name}</div>
                            <div>{selectedTable.columns.length} columns · {selectedTable.foreignKeys.length} outgoing relations</div>
                          </div>
                          <div>
                            <div className="mb-1 text-[0.72rem] uppercase tracking-[0.22em] text-[#70827f]">Primary keys</div>
                            <div>{selectedTable.primaryKeys.length ? selectedTable.primaryKeys.join(", ") : "None detected"}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-[0.72rem] uppercase tracking-[0.22em] text-[#70827f]">Foreign keys</div>
                            <div>
                              {selectedTable.foreignKeys.length
                                ? selectedTable.foreignKeys.map((fk) => `${fk.column} → ${fk.referencesTable}.${fk.referencesColumn}`).join("\n")
                                : "No outgoing relations"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm leading-7 text-[#526663]">No table selected.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
