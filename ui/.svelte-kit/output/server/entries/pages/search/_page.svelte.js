import { c as create_ssr_component, a as subscribe, v as validate_component } from "../../../chunks/ssr.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { p as page } from "../../../chunks/stores.js";
import { P as ProjectForm } from "../../../chunks/ProjectForm.js";
const css = {
  code: ".page.svelte-3vhm7j{max-width:640px;margin:0 auto;padding:3.5rem 1.5rem}.header.svelte-3vhm7j{text-align:center;margin-bottom:2.5rem}h1.svelte-3vhm7j{font-size:clamp(1.75rem, 3.5vw, 2.5rem);font-weight:900;color:#0a0907;margin:0 0 0.5rem;letter-spacing:-0.03em;line-height:0.95}p.svelte-3vhm7j{color:#8a8070;font-size:1rem;margin:0;line-height:1.6}",
  map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { goto } from \\"$app/navigation\\";\\nimport { page } from \\"$app/stores\\";\\nimport ProjectForm from \\"$lib/components/ProjectForm.svelte\\";\\nimport { pendingSearch } from \\"$lib/stores/SearchStore\\";\\nconst initialDescription = $page.url.searchParams.get(\\"q\\") ?? \\"\\";\\nfunction handleSubmit(event) {\\n  pendingSearch.set(event.detail);\\n  goto(\\"/matches\\");\\n}\\n<\/script>\\n\\n<svelte:head>\\n  <title>Find Engineers — whodoesthe.work</title>\\n</svelte:head>\\n\\n<div class=\\"page\\">\\n  <div class=\\"header\\">\\n    <h1>Find engineers</h1>\\n    <p>Describe what you're building. We'll match you with developers who've shipped similar work.</p>\\n  </div>\\n  <ProjectForm {initialDescription} on:submit={handleSubmit} />\\n</div>\\n\\n<style>\\n  .page {\\n    max-width: 640px;\\n    margin: 0 auto;\\n    padding: 3.5rem 1.5rem;\\n  }\\n\\n  .header {\\n    text-align: center;\\n    margin-bottom: 2.5rem;\\n  }\\n\\n  h1 {\\n    font-size: clamp(1.75rem, 3.5vw, 2.5rem);\\n    font-weight: 900;\\n    color: #0a0907;\\n    margin: 0 0 0.5rem;\\n    letter-spacing: -0.03em;\\n    line-height: 0.95;\\n  }\\n\\n  p {\\n    color: #8a8070;\\n    font-size: 1rem;\\n    margin: 0;\\n    line-height: 1.6;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAwBE,mBAAM,CACJ,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,MAAM,CAAC,MAClB,CAEA,qBAAQ,CACN,UAAU,CAAE,MAAM,CAClB,aAAa,CAAE,MACjB,CAEA,gBAAG,CACD,SAAS,CAAE,MAAM,OAAO,CAAC,CAAC,KAAK,CAAC,CAAC,MAAM,CAAC,CACxC,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,cAAc,CAAE,OAAO,CACvB,WAAW,CAAE,IACf,CAEA,eAAE,CACA,KAAK,CAAE,OAAO,CACd,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,GACf"}`
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const initialDescription = $page.url.searchParams.get("q") ?? "";
  $$result.css.add(css);
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-h9zn9z_START -->${$$result.title = `<title>Find Engineers — whodoesthe.work</title>`, ""}<!-- HEAD_svelte-h9zn9z_END -->`, ""} <div class="page svelte-3vhm7j"><div class="header svelte-3vhm7j" data-svelte-h="svelte-1kmly40"><h1 class="svelte-3vhm7j">Find engineers</h1> <p class="svelte-3vhm7j">Describe what you&#39;re building. We&#39;ll match you with developers who&#39;ve shipped similar work.</p></div> ${validate_component(ProjectForm, "ProjectForm").$$render($$result, { initialDescription }, {}, {})} </div>`;
});
export {
  Page as default
};
