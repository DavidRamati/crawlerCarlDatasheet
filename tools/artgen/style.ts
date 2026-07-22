// Shared style token + prompt builders. Human-facing notes live in style.md.
export const STYLE_TOKEN =
  "Hand-painted fantasy RPG illustration in the style of the Fabled Lands " +
  "gamebook / classic character art: painterly brushwork, warm muted earthy " +
  "palette, soft directional lighting, subtle parchment texture, clean neutral " +
  "aged-paper background, no text, no UI, no border frame";

export function characterPrompt(bibleDescription: string, outfit: string): string {
  return (
    `${STYLE_TOKEN}. Full-body character portrait, standing, facing viewer, ` +
    `head to toe, centred. ${bibleDescription}. Currently: ${outfit}. ` +
    `Single figure, no props beyond described gear.`
  );
}

/**
 * Icon prompt. `details` carries the item's APPEARANCE (its `description`, or a
 * cleaner `hint`/`description` override from art-src/<book>/items.json). The
 * description is the main source of what the item looks like — we keep it — but
 * the prompt hard-constrains the render to the isolated object and tells the
 * model to ignore any story context (owner, location, how it was obtained,
 * effects) that also lives in the description. That's what stops leaks like
 * "in Carl's pocket" while preserving "a jeweled tiara with a purple centre gem".
 */
export function itemPrompt(name: string, details?: string): string {
  return (
    `${STYLE_TOKEN}. A single video-game inventory item icon of: ${name}.` +
    (details
      ? ` Use ONLY the physical/visual details from this description and ignore ` +
        `any story context (owner, location, how it was obtained, effects, or ` +
        `where it is kept): "${details}".`
      : "") +
    ` Show ONLY the item itself as one isolated object, centred and floating on ` +
    `a plain neutral aged-parchment background, soft drop shadow. No people, no ` +
    `hands, no body parts, no scene, no environment, no packaging context, no ` +
    `text or labels.`
  );
}

export function scenePrompt(description: string): string {
  return (
    `${STYLE_TOKEN}. Wide establishing background environment, NO people or ` +
    `characters: ${description}. Atmospheric scene art, landscape orientation, ` +
    `empty of figures so a character can stand in front of it.`
  );
}
