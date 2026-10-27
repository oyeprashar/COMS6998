import { observabilityDb } from "@/lib/observability";

export type GenerationConfig = {
  modelIds: string[];
  chainId: string | null;
  descriptionPrompt: string | null;
  captionPrompt: string | null;
};

export async function getGenerationConfig(): Promise<GenerationConfig | null> {
  if (process.env.USE_DB_AI_CONFIGURATION !== "true") return null;
  const db = observabilityDb();
  if (!db) return null;

  // Only Gemini models are supported by the application's Google SDK.
  const { data: providers } = await db.from("llm_providers")
    .select("id,name").eq("is_active",true);
  const googleProviderIds = (providers ?? [])
    .filter(p => /google|gemini/i.test(p.name)).map(p => p.id);
  let modelIds: string[] = [];
  if (googleProviderIds.length) {
    const { data: models } = await db.from("llm_models")
      .select("model_identifier").eq("is_active",true)
      .in("llm_provider_id", googleProviderIds).order("name");
    modelIds = (models ?? []).map(m => m.model_identifier)
      .filter(v => /^gemini-[a-z0-9._-]+$/i.test(v));
  }

  const { data: chains, error: chainError } = await db.from("prompt_chains")
    .select("id").eq("is_active",true);
  if (chainError || !chains?.length) return { modelIds, chainId:null, descriptionPrompt:null, captionPrompt:null };

  const { data: mix } = await db.from("prompt_chain_mix").select("prompt_chain_id,weight");
  const weights = new Map((mix ?? []).map(x => [x.prompt_chain_id, Number(x.weight)]));
  const weighted = chains.map(c => ({id:c.id, weight:weights.get(c.id) ?? 1}))
    .filter(c => Number.isFinite(c.weight) && c.weight > 0);
  if (!weighted.length) return { modelIds, chainId:null, descriptionPrompt:null, captionPrompt:null };
  const total = weighted.reduce((sum,c)=>sum+c.weight,0);
  let pick=Math.random()*total;
  let chosen=weighted[weighted.length-1];
  for (const candidate of weighted) {
    pick-=candidate.weight;
    if (pick<=0) {chosen=candidate;break;}
  }

  const { data: steps } = await db.from("prompt_chain_steps")
    .select("step_number,prompt_template").eq("prompt_chain_id",chosen.id)
    .order("step_number",{ascending:true});
  if (!steps || steps.length !== 2 || !steps[0].prompt_template || !steps[1].prompt_template) {
    // Unrecognized chains are not silently used as executable pipelines.
    return { modelIds, chainId:null, descriptionPrompt:null, captionPrompt:null };
  }
  return {
    modelIds, chainId:chosen.id,
    descriptionPrompt:steps[0].prompt_template,
    captionPrompt:steps[1].prompt_template,
  };
}
