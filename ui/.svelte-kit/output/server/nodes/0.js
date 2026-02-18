

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.I5SCKYhd.js","_app/immutable/chunks/DEkK7G5O.js","_app/immutable/chunks/DCJ371I_.js","_app/immutable/chunks/ChQ39boa.js","_app/immutable/chunks/Cbn2MTp2.js","_app/immutable/chunks/DiLGzqDM.js","_app/immutable/chunks/DKD-WnE7.js"];
export const stylesheets = ["_app/immutable/assets/0.B5CnRJs3.css"];
export const fonts = [];
