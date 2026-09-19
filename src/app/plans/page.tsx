import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { getRoutineListPageState } from "@/modules/planning/server/routines";
import { getRoutineTemplateListPageState } from "@/modules/planning/server/templates";
import { CreateRoutineFromTemplateForm,SaveRoutineTemplateForm } from "./template-controls";
export const metadata={title:"Plans"}; export const dynamic="force-dynamic";
const savedDate=(value:string)=>new Intl.DateTimeFormat("en-AU",{dateStyle:"medium"}).format(new Date(value));
export default async function PlansPage(){
  const[routineState,templateState]=await Promise.all([getRoutineListPageState(),getRoutineTemplateListPageState()]);
  const signedOut=routineState.kind==="signed-out"||templateState.kind==="signed-out"; const unavailable=routineState.kind==="unavailable"||templateState.kind==="unavailable";
  return <><PageIntro eyebrow="Plans" title="Your saved routines"><p>Saved routine versions keep exact exercise-version references. Reusable templates capture an immutable routine-version snapshot and create a new ordinary routine only after current readiness and content rules are rechecked.</p></PageIntro>
  {signedOut?<section className="card"><h2>Sign in to view saved routines and templates</h2><Link className="button" href="/auth/sign-in">Sign in</Link></section>:null}
  {!signedOut&&unavailable?<section className="card"><h2>Saved planning data is not available right now</h2></section>:null}
  {!signedOut&&!unavailable&&routineState.kind==="authenticated"&&templateState.kind==="authenticated"?<>
    <section className="form-stack" aria-labelledby="saved-routines-title"><div><p className="status-label">Routines</p><h2 id="saved-routines-title">Saved routines</h2></div>{routineState.routines.length===0?<div className="empty-state"><h3>No routines yet</h3><p>Create a manual or guided routine from approved exercise versions.</p><Link className="text-link" href="/create">Create a routine</Link></div>:<div className="card-grid">{routineState.routines.map((r)=><article className="card" key={r.id}><p className="status-label">Routine Â· version {r.versionNumber}</p><h3>{r.title}</h3><p>{r.itemCount} {r.itemCount===1?"exercise":"exercises"} Â· saved {savedDate(r.createdAt)}</p><Link className="button button-secondary" href={`/routines/${r.id}`}>View routine</Link><SaveRoutineTemplateForm routineId={r.id} routineTitle={r.title}/></article>)}</div>}</section>
    <section className="form-stack" aria-labelledby="routine-templates-title"><div><p className="status-label">Reusable templates Â· free</p><h2 id="routine-templates-title">Reusable routine templates</h2><p>There is no subscription or saved-template count gate. A template stays pinned to the exact routine version captured when saved.</p></div>{templateState.templates.length===0?<div className="empty-state"><h3>No templates yet</h3><p>Save any current routine as a reusable template above.</p></div>:<div className="card-grid">{templateState.templates.map((t)=><article className="card" key={t.id}><p className="status-label">Template Â· source routine version {t.sourceRoutineVersionNumber}</p><h3>{t.title}</h3><p>{t.itemCount} {t.itemCount===1?"exercise":"exercises"} Â· source â€œ{t.sourceRoutineTitle}â€ Â· saved {savedDate(t.createdAt)}</p><CreateRoutineFromTemplateForm templateId={t.id} templateTitle={t.title}/></article>)}</div>}</section>
  </>:null}</>;
}
