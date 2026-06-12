// SPDX-License-Identifier: MIT
//
// The PluginUI bundle the shell loads at runtime from
// /modules/vcbrain/ui/index.mjs. Contributes the sidebar pages (Pipeline,
// Thesis Studio), the dossier route, and two Home dashboard widgets.

import "./index.css";
import type { PluginUI } from "@boringos/ui";
import { PipelinePage } from "./pages/Pipeline.js";
import { DossierPage } from "./pages/Dossier.js";
import { ThesisStudioPage } from "./pages/ThesisStudio.js";
import { IngestionPage } from "./pages/Ingestion.js";
import { AgentsPage } from "./pages/Agents.js";
import { SubmitPage } from "./pages/Submit.js";
import { ScoredPipelineWidget, FreshBriefsWidget } from "./dashboard/widgets.js";

export const vcbrainUI: PluginUI = {
  moduleId: "vcbrain",
  displayName: "VCBrain",
  navItems: [
    { id: "ingestion", label: "Fund Knowledge", path: "/vcbrain/ingestion", element: IngestionPage, order: 5 },
    { id: "pipeline", label: "Pipeline", path: "/vcbrain/pipeline", element: PipelinePage, order: 10 },
    { id: "thesis", label: "Thesis Studio", path: "/vcbrain/thesis", element: ThesisStudioPage, order: 20 },
    { id: "agents", label: "Agents", path: "/vcbrain/agents", element: AgentsPage, order: 25 },
    { id: "submit", label: "Submit a deal", path: "/vcbrain/submit", element: SubmitPage, order: 30 },
    // Detail route — mounted but hidden from the sidebar; reached via in-page links.
    { id: "startup", label: "Startup", path: "/vcbrain/startups/:id", element: DossierPage, hidden: true },
  ],
  dashboardWidgets: [
    { id: "scored-pipeline", title: "Scored pipeline", size: "medium", slot: "primary", element: ScoredPipelineWidget, order: 50 },
    { id: "fresh-briefs", title: "Fresh briefs", size: "small", slot: "secondary", element: FreshBriefsWidget, order: 60 },
  ],
};

export default vcbrainUI;
