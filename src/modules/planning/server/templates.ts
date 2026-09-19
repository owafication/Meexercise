import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type RoutineTemplateListItem = {
  id: string; title: string; sourceRoutineId: string; sourceRoutineTitle: string;
  sourceRoutineVersionNumber: number; itemCount: number; createdAt: string;
};
export type RoutineTemplateListPageState =
  | { kind: "authenticated"; templates: RoutineTemplateListItem[] }
  | { kind: "signed-out" }
  | { kind: "unavailable" };
export type RoutineTemplateExportRecord = RoutineTemplateListItem & { sourceRoutineVersionId: string };

async function loadTemplateRecords(supabase: SupabaseClient,userId: string): Promise<RoutineTemplateExportRecord[] | null> {
  const { data: templates, error } = await supabase.from("routine_templates").select("id,title,source_routine_version_id,created_at").eq("user_id",userId).order("created_at",{ ascending:false });
  if (error) return null;
  if (!templates?.length) return [];
  const versionIds = templates.map((t) => String(t.source_routine_version_id));
  const { data: versions, error: versionError } = await supabase.from("routine_versions").select("id,routine_id,version_number,title").in("id",versionIds);
  if (versionError) return null;
  const byVersion = new Map((versions ?? []).map((v) => [String(v.id),v]));
  const { data: sections, error: sectionError } = await supabase.from("routine_sections").select("id,routine_version_id").in("routine_version_id",versionIds);
  if (sectionError) return null;
  const sectionIds=(sections??[]).map((s)=>String(s.id));
  const sectionToVersion=new Map((sections??[]).map((s)=>[String(s.id),String(s.routine_version_id)]));
  let items:Array<Record<string,unknown>>=[];
  if(sectionIds.length){ const q=await supabase.from("routine_items").select("routine_section_id").in("routine_section_id",sectionIds); if(q.error)return null; items=(q.data??[]) as Array<Record<string,unknown>>; }
  const counts=new Map<string,number>();
  for(const item of items){ const v=sectionToVersion.get(String(item.routine_section_id)); if(v) counts.set(v,(counts.get(v)??0)+1); }
  const result:RoutineTemplateExportRecord[]=[];
  for(const t of templates){ const v=byVersion.get(String(t.source_routine_version_id)); if(!v)return null; result.push({ id:String(t.id), title:String(t.title), createdAt:String(t.created_at), sourceRoutineId:String(v.routine_id), sourceRoutineVersionId:String(v.id), sourceRoutineVersionNumber:Number(v.version_number), sourceRoutineTitle:String(v.title), itemCount:counts.get(String(v.id))??0 }); }
  return result;
}

export async function getRoutineTemplateListPageState(): Promise<RoutineTemplateListPageState> {
  try { const supabase=await createClient(); const userId=await getVerifiedUserId(supabase); if(!userId)return{kind:"signed-out"}; const templates=await loadTemplateRecords(supabase,userId); return templates===null?{kind:"unavailable"}:{kind:"authenticated",templates}; }
  catch { return { kind:"unavailable" }; }
}
export async function buildUserRoutineTemplateExport(supabase:SupabaseClient,userId:string){ return loadTemplateRecords(supabase,userId); }
