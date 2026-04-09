## Goal

Make the food, weather, pet, and profile widgets match the dark translucent visual system used by the RSS widget on board dark themes.

## User-visible outcome

- On dark board themes, the food widget header and recommendation cards use the same dark translucent contrast pattern as the RSS widget.
- On dark board themes, the weather current-condition panel no longer appears as a bright opaque block.
- On dark board themes, the pet widget no longer shows a stray bright framed panel.
- On dark board themes, the profile widget name and occupation read clearly and its meta rows use translucent panels.
- The food, weather, pet, and profile widget text remains readable without light gray blocks breaking the card look.

## In scope

- `src/styles/main.css` food, weather, pet, and profile widget dark-theme styling
- Dark-theme-only visual alignment for widget surfaces, labels, and text contrast

## Out of scope

- Food recommendation data or selection logic
- Layout or spacing changes outside the food widget

## Risks

- Dark-theme overrides could unintentionally affect light-theme widgets if selectors are too broad.
- Badge colors could lose category distinction if the translucency is over-normalized.

## Pass criteria

- `981px+`: on Midnight Ops and Neon Lab, the food widget no longer shows bright opaque inner cards.
- `981px+`: on Midnight Ops and Neon Lab, the weather location panel no longer shows a bright opaque background.
- `981px+`: the food, weather, pet, and profile widgets read with clear contrast similar to the RSS widget.
- `981px+`: category pills remain visually distinct while fitting the dark translucent card system.
- `980px and below`: compact food, weather, pet, and profile widgets keep readable contrast and no overflow regression.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
