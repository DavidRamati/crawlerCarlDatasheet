# Art style token & prompt templates

Shared visual language for all generated art. Keep this stable so every image
looks like one set. Tune the wording here, not in the scripts.

## STYLE_TOKEN (prepended to every prompt)

> Hand-painted fantasy RPG illustration in the style of the Fabled Lands
> gamebook / classic Sabertooth-Games character art: painterly brushwork, warm
> muted earthy palette, soft directional lighting, subtle parchment texture,
> clean neutral background (aged paper), no text, no UI, no border frame.

## Character full-body template

`{STYLE_TOKEN}. Full-body character portrait, standing, facing viewer, head to
toe, centred. {BIBLE_DESCRIPTION}. Currently: {OUTFIT_DESCRIPTION}. Single
figure, no props beyond described gear.`

Character images are generated at 1024×1536 (portrait) and saved as
`public/art/<book>/<char>/<stateId>.png`. When a canonical reference portrait
exists it is passed as a reference image so the same character is re-dressed
consistently across outfit states.

## Item icon template

`{STYLE_TOKEN}. A single game item icon: {ITEM_NAME}. {ITEM_DESCRIPTION}.
Centred object on a plain aged-parchment background, soft shadow, no text.`

Item icons are generated at 1024×1024 and saved as
`public/art/<book>/items/<itemId>.png`.
